var fse = require('fs-extra');
var path = require('path');

var ReadWriteLock = require('rwlock');
var log = require('npmlog');
var shortid = require('shortid');

var config = require('./config');

var lock = new ReadWriteLock();
var buildRoot = path.join(config.releaseRoot, '..', 'builds');
var base64chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';


/**
 * Build job states.
 * @enum {string}
 */
var states = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  ERROR: 'error'
};

function noop() {
  // pass
}

function getIndexPath(release) {
  return path.join(buildRoot, release.name, 'index.json');
}

/**
 * Error representing an invalid build config.
 * @param {string} message Error message.
 * @constructor
 */
var InvalidConfig = exports.InvalidConfig = function(message) {
  this.message = message;
  this.stack = (new Error()).stack;
};
InvalidConfig.prototype = new Error();
InvalidConfig.prototype.name = 'InvalidConfig';

/**
 * Get a unique identifier for a user generated build configuration.  The
 * identifier takes the form <symbols_enc>.<defines_enc> where the
 * symbols_enc and defines_enc are base 64 encoded values.  The symbols value
 * can be thought of a bit map where each bit determines if a particular symbol
 * is exported.  Likewise, the boolean defines can be represented as a binary
 * where each bit determines the value of the define.  These two values are
 * base64 encoded and concatenated with a dot to generate the build identifier.
 *
 * Throws InvalidConfig if the build config includes invalid symbols or defines.
 *
 * @param {Object} buildConfig A build configuration with an array of symbols
 *     and a defines object.
 * @param {Object} releaseInfo An info.json object for a release.
 * @return {string} A unique identifier for the build.
 */
var getLongId = exports.getLongId = function(buildConfig, releaseInfo) {
  var symbolLookup = {};
  var id = '';
  var bits = 6;
  var validSymbols = {};
  var validDefines = {};
  var i, ii, j, value, name;

  for (i = 0, ii = buildConfig.symbols.length; i < ii; ++i) {
    symbolLookup[buildConfig.symbols[i]] = true;
  }

  // encode exported symbols
  for (i = 0, ii = releaseInfo.symbols.length; i < ii; i += bits) {
    value = 0;
    for (j = 0; j < bits && i + j < ii; ++j) {
      name = releaseInfo.symbols[i + j].name;
      validSymbols[name] = true;
      if (symbolLookup[name]) {
        value |= 1 << j;
      }
    }
    id += base64chars[value];
  }

  id += '.';

  // encode defines
  for (i = 0, ii = releaseInfo.defines.length; i < ii; i += bits) {
    value = 0;
    for (j = 0; j < bits && i + j < ii; ++j) {
      name = releaseInfo.defines[i + j].name;
      validDefines[name] = true;
      if (name in buildConfig.defines) {
        if (buildConfig.defines[name]) {
          value |= 1 << j;
        }
      } else if (releaseInfo.defines[i + j].default) {
        value |= 1 << j;
      }
    }
    id += base64chars[value];
  }

  // validate symbols
  for (name in symbolLookup) {
    if (!(name in validSymbols)) {
      throw new InvalidConfig('Invalid symbol name: ' + name);
    }
  }

  // validate defines
  for (name in buildConfig.defines) {
    if (!(name in validDefines)) {
      throw new InvalidConfig('Invalid define: ' + name);
    }
  }

  return id;
};

var newIndex = exports.newIndex = function() {
  return {
    ids: {},
    jobs: {}
  };
};

var getIndex = exports.getIndex = function(release, callback) {
  lock.readLock(function(unlock) {
    var indexPath = getIndexPath(release);
    fse.readJson(indexPath, function(err, index) {
      unlock();
      if (err) {
        if (err.code !== 'ENOENT') {
          callback(new Error('Failed to read build index: ' + err.message));
          return;
        }
        index = newIndex();
      }
      callback(null, index);
    });
  });
};

var updateIndex = exports.updateIndex =
    function(release, longId, shortId, status, callback) {
  var now = Date.now();
  lock.writeLock(function(unlock) {
    var indexPath = getIndexPath(release);
    fse.readJson(indexPath, function(err, index) {
      if (err) {
        index = newIndex();
      }
      index.ids[longId] = shortId;
      if (!(shortId in index.jobs)) {
        index.jobs[shortId] = {
          status: status,
          created: now,
          updated: now
        };
      } else {
        index.jobs[shortId].status = status;
        index.jobs[shortId].updated = now;
      }
      fse.outputJson(indexPath, index, function(err2) {
        unlock();
        if (err2) {
          callback(new Error('Failed to write build index: ' + err2.message));
          return;
        }
        callback(null, index);
      });
    });
  });
};

var spawnBuild = exports.spawnBuild = function(release, buildConfig, callback) {
  setTimeout(function() {
    callback(null);
  }, 10000);
};

exports.getOrCreate = function(release, buildConfig, callback) {
  release.getInfo(function(err, info) {
    if (err) {
      callback(err);
      return;
    }
    var longId;
    try {
      longId = getLongId(buildConfig, info);
    } catch (err2) {
      callback(err2);
      return;
    }
    getIndex(release, function(err3, index) {
      if (err3) {
        callback(err3);
        return;
      }
      var shortId;
      if (longId in index.ids) {
        shortId = index.ids[longId];
        if (!(shortId in index.jobs)) {
          callback(new Error('Inconsistent index - missing job: ' + shortId));
        } else {
          callback(null, shortId);
        }
      } else {
        shortId = shortid.generate();
        updateIndex(release, longId, shortId, states.PENDING, function(err4) {
          if (err4) {
            callback(new Error('Failed to update index: ' + err4.message));
            return;
          }
          log.verbose('build',
              'Build started: ' + release.name + ' ' + shortId);
          spawnBuild(release, buildConfig, function(err5) {
            if (err5) {
              log.error('build',
                  'Build failed: ' + release.name + ' ' + shortId +
                  err5.message);
              updateIndex(release, longId, shortId, states.ERROR, noop);
              return;
            }
            log.verbose('build',
                'Build complete: ' + release.name + ' ' + shortId);
            updateIndex(release, longId, shortId, states.COMPLETE, noop);
          });
          callback(null, shortId);
        });
      }
    });
  });
};

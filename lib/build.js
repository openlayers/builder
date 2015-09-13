var path = require('path');
var spawn = require('child_process').spawn;

var ReadWriteLock = require('rwlock');
var fse = require('fs-extra');
var log = require('npmlog');
var shortid = require('shortid');
var util = require('openlayers-builder-util');

var config = require('./config');

var lock = new ReadWriteLock();

/**
 * Build job states.
 * @enum {string}
 */
var states = exports.states = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  ERROR: 'error'
};

function noop() {
  // pass
}

function getIndexPath(release) {
  return path.join(config.buildRoot, release.name, 'index.json');
}

function getBuildPath(release, shortId) {
  return path.join(config.buildRoot, release.name, shortId, 'ol.min.js');
}

function getBuildConfigPath(release, shortId) {
  return path.join(config.buildRoot, release.name, shortId, 'build.json');
}

function getJobConfigPath(release, shortId) {
  return path.join(config.buildRoot, release.name, shortId, 'job.json');
}

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

var updateIndex = exports.updateIndex = function(release, longId, shortId, status, callback) {
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
          id: shortId,
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

var writeBuildConfig = exports.writeBuildConfig = function(release, shortId, buildConfig, callback) {
  var buildConfigPath = getBuildConfigPath(release, shortId);
  fse.outputJson(buildConfigPath, buildConfig, callback);
};

var createBuildConfig = exports.createBuildConfig = function(release, shortId, jobConfig, callback) {
  release.getFullBuildConfig(function(err, buildConfig) {
    if (err) {
      callback(err);
      return;
    }
    // export symbols
    var symbols = [];
    for (var symbolName in jobConfig.symbols) {
      if (jobConfig.symbols[symbolName]) {
        symbols.push(symbolName);
      }
    }
    buildConfig.exports = symbols;

    // set defines
    var define = [];
    for (var defineName in jobConfig.defines) {
      define.push(defineName + '=' + jobConfig.defines[defineName]);
    }
    buildConfig.compile.define = define;

    // TODO: see https://github.com/openlayers/ol3/issues/3452
    delete buildConfig.compile['manage_closure_dependencies'];

    // simplify the config
    delete buildConfig.compile['jscomp_error'];
    delete buildConfig.compile['create_source_map'];
    delete buildConfig.compile['source_map_format'];

    writeBuildConfig(release, shortId, buildConfig, function(err2) {
      if (err2) {
        callback(err2);
        return;
      }
      callback(null, buildConfig);
    });
  });
};

var spawnBuild = exports.spawnBuild = function(release, shortId, callback) {
  var command = 'node';
  var buildTask = path.join(config.releaseRoot, release.name, 'tasks', 'build.js');
  var buildConfigPath = getBuildConfigPath(release, shortId);
  var buildPath = getBuildPath(release, shortId);
  var args = [buildTask, buildConfigPath, buildPath, '--loglevel', config.logLevel];
  var child = spawn(command, args);
  var stderr = '';
  child.stderr.on('data', function(data) {
    stderr += data;
  });
  child.on('close', function(code) {
    if (code) {
      callback(new Error('Build failed: ' + stderr));
      return;
    }
    callback(null);
  });
};

var writeJobConfig = exports.writeJobConfig = function(release, shortId, jobConfig, callback) {
  var jobConfigPath = getJobConfigPath(release, shortId);
  fse.outputJson(jobConfigPath, jobConfig, callback);
};

function createJob(release, longId, jobConfig, callback) {
  var shortId = shortid.generate();
  writeJobConfig(release, shortId, jobConfig, function(err) {
    if (err) {
      callback(err);
      return;
    }
    updateIndex(release, longId, shortId, states.PENDING, function(err2) {
      if (err2) {
        callback(new Error('Failed to update index: ' + err2.message));
        return;
      }
      createBuildConfig(release, shortId, jobConfig, function(err3, buildConfig) {
        if (err3) {
          callback(new Error('Failed to create build config: ' + err3.message));
          return;
        }
        log.verbose('build', 'Build started: ' + release.name + ' ' + shortId);
        spawnBuild(release, shortId, function(err4) {
          if (err4) {
            log.error('build', 'Build failed: ' + release.name + ' ' + shortId +
                err4.message);
            updateIndex(release, longId, shortId, states.ERROR, noop);
            return;
          }
          log.verbose('build', 'Build complete: ' + release.name + ' ' + shortId);
          updateIndex(release, longId, shortId, states.COMPLETE, noop);
        });
        callback(null, {id: shortId, status: states.PENDING});
      });
    });
  });
}

var getJobByLongId = exports.getJobByLongId = function(release, longId, callback) {
  getIndex(release, function(err, index) {
    if (err) {
      callback(err);
    }
    if (longId in index.ids) {
      var shortId = index.ids[longId];
      if (shortId in index.jobs) {
        callback(null, index.jobs[shortId]);
      } else {
        callback(new Error('Inconsistent index - missing job: ' + shortId));
      }
    } else {
      callback(null, null);
    }
  });
};

exports.getOrCreateJob = function(release, jobConfig, callback) {
  release.getInfo(function(err, info) {
    if (err) {
      callback(err);
      return;
    }
    var longId;
    try {
      longId = util.getLongId(jobConfig, info);
    } catch (err2) {
      callback(err2);
      return;
    }
    getJobByLongId(release, longId, function(err3, job) {
      if (err3) {
        callback(err3);
        return;
      }
      if (job) {
        callback(null, job);
      } else {
        createJob(release, longId, jobConfig, callback);
      }
    });
  });
};

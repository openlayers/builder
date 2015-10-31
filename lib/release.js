var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var async = require('async');
var get = require('get-down');
var log = require('npmlog');
var rimraf = require('rimraf');

var config = require('./config');

/**
 * Release constructor.
 * @param {Object} options Object with name and archive properties.
 * @constructor
 */
function Release(options) {
  if (!options) {
    throw new Error('Missing options');
  }
  if (!options.name) {
    throw new Error('Missing name property');
  }
  this.name = options.name;

  if (!options.archive) {
    throw new Error('Missing archive property');
  }
  this.archive = options.archive;

  this.state = options.state || Release.states.PENDING;

  var now = new Date();
  this.created = options.created || now;
  this.updated = options.updated || now;
}


/**
 * Save a new release.  Only works with newly constructed releases (cannot be
 * used to update properties after a previous save).
 * @param {function(Error, Release)} callback Called after save.
 */
Release.prototype.save = function(callback) {
  async.series([
    this._assertNew.bind(this),
    this._writeConfig.bind(this),
    this._download.bind(this),
    this._install.bind(this),
    this._generateInfo.bind(this),
    this._markComplete.bind(this)
  ], function(err) {
    if (err) {
      callback(err);
    } else {
      log.verbose('release', 'Release ' + this.name + ' ready');
      callback(null, this);
    }
  }.bind(this));
};


/**
 * Remove a release.
 * @param {function(Error)} callback Called after removal.
 */
Release.prototype.remove = function(callback) {
  var name = this.name;
  var artifacts = [getReleaseDir(name), getReleaseConfig(name)];
  async.each(artifacts, rimraf, function(err) {
    if (err) {
      callback(new Error('Failed to remove ' + name + ': ' + err.message));
    } else {
      callback(null);
    }
  });
};


/**
 * Get the metadata for the release.
 * @param {function(Error, Object)} callback Called with the parsed info.json
 *     file or any error.
 */
Release.prototype.getInfo = function(callback) {
  var name = this.name;
  fs.readFile(getInfoFile(name), function(err, data) {
    if (err) {
      callback(new Error(
          'Failed to read info file for ' + name + ': ' + err.message));
      return;
    }
    var info;
    try {
      info = JSON.parse(String(data));
    } catch (err) {
      callback(new Error(
          'Error parsing info file for ' + name + ': ' + err.message));
      return;
    }
    callback(null, info);
  });
};


/**
 * Get the full build config for the release.
 * @param {function(Error, Object)} callback Called with the parsed build config
 *     file or any error.
 */
Release.prototype.getFullBuildConfig = function(callback) {
  var name = this.name;
  fs.readFile(getFullBuildConfig(name), function(err, data) {
    if (err) {
      callback(new Error(
          'Failed to read build config file for ' + name + ': ' + err.message));
      return;
    }
    var buildConfig;
    try {
      buildConfig = JSON.parse(String(data));
    } catch (err) {
      callback(new Error(
          'Error parsing build config file for ' + name + ': ' + err.message));
      return;
    }
    callback(null, buildConfig);
  });
};


/**
 * String representation of a release.
 * @return {string} String representation.
 */
Release.prototype.toString = function() {
  return JSON.stringify({
    name: this.name,
    archive: this.archive,
    state: this.state,
    created: this.created.getTime(),
    updated: this.updated.getTime()
  }, null, 2);
};


/**
 * Assert that artifacts for a release don't already exist.
 * @param {function(Error)} callback Called with an error if a release exists.
 */
Release.prototype._assertNew = function(callback) {
  var name = this.name;
  var artifacts = [getReleaseDir(name), getReleaseConfig(name)];
  async.some(artifacts, fs.exists, function(exists) {
    if (exists) {
      callback(new Error('Release ' + name + ' already exists'));
    } else {
      callback(null);
    }
  });
};


/**
 * Download and extract a release.
 * @param {function(Error)} callback Called when complete.
 */
Release.prototype._download = function(callback) {
  var name = this.name;
  var archive = this.archive;
  var dir = getReleaseDir(name);
  fs.mkdir(dir, function(err) {
    if (err) {
      var msg = 'Trouble creating directory for ' + name + ': ' + err.message;
      callback(new Error(msg));
    } else {
      log.verbose('release', 'Downloading ' + name + ' (' + archive + ' -> ' +
          dir + ')');

      var job = get(archive, {dest: getReleaseDir(name), extract: true});

      job.once('error', callback);

      job.on('progress', function(state) {
        if (state.retry) {
          var delay = Math.round(state.delay / 1000) + 's';
          log.verbose('release',
              'Download for ' + name + ' failed, retrying again in ' + delay);
        } else {
          var progress = Math.floor(state.received / 1024) + 'K';
          if (state.percent) {
            progress = state.percent + '% (' + progress + ')';
          }
          log.verbose('release', 'Received ' + progress + ' of ' + name);
        }
      });

      job.once('end', function(dest) {
        callback(null);
      });
    }
  });
};


/**
 * Write out the release metadata.
 * @param {function(Error)} callback Called when complete.
 */
Release.prototype._writeConfig = function(callback) {
  fs.writeFile(
      getReleaseConfig(this.name), this.toString(), {flag: 'wx'}, callback);
};


/**
 * Run `npm install` in a release directory.
 * @param {function(Error)} callback Called when install completes.
 */
Release.prototype._install = function(callback) {
  var name = this.name;
  log.verbose('release', 'Installing ' + name);

  var child = spawn('npm', ['install', '--production'], {cwd: getReleaseDir(name)});
  var errors = [];
  child.stderr.on('data', function(data) {
    errors.push(String(data));
  });
  child.stdout.on('data', function(data) {
    var str = String(data);
    log.silly('release', str);
  });
  child.on('close', function(code) {
    if (code) {
      var msg = 'Install failed for ' + name + '\n' + errors.join('\n');
      callback(new Error(msg));
    } else {
      callback(null);
    }
  });
};


/**
 * Run generate-info.js in a release directory.
 * @param {function(Error)} callback Called when complete.
 */
Release.prototype._generateInfo = function(callback) {
  var name = this.name;
  var dir = getReleaseDir(name);

  log.verbose('release', 'Generating info for ' + name);
  var args = [path.join('tasks', 'generate-info.js')];
  var child = spawn('node', args, {cwd: dir});
  var errors = [];
  child.stderr.on('data', function(data) {
    errors.push(String(data));
  });
  child.on('close', function(code) {
    if (code) {
      var msg = 'Generating info failed for ' + name + '\n' +
          errors.join('\n');
      callback(new Error(msg));
    } else {
      callback();
    }
  });
};


/**
 * Mark a release as complete.
 * @param {function(Error)} callback Called when done.
 */
Release.prototype._markComplete = function(callback) {
  this.state = Release.states.COMPLETE;
  this.updated = new Date();
  fs.writeFile(getReleaseConfig(this.name), this.toString(), callback);
};


/**
 * Get all releases.  The presence of a release is determined by a JSON file
 * in the release directory.
 * @param {function(Error, Array.<Release>)} callback Called with a list of
 *     releases or any error.
 */
Release.all = function(callback) {
  fs.readdir(config.releaseRoot, function(err, entries) {
    if (err) {
      callback(err);
    } else {
      entries = entries.filter(function(entry) {
        return !!entry.match(/\.json$/);
      });
      async.map(entries, function(entry, done) {
        Release.fromFile(path.join(config.releaseRoot, entry), done);
      }, callback);
    }
  });
};


/**
 * Find releases given a query object.
 * @param {Object} query Simple query object.  Only supports queries comparing
 *     property values for equality.  E.g. {name: 'foo'} will return a release
 *     named 'foo' (or null if not found).
 * @param {function(Error, Array.<release>)} callback Called with list of
 *     matching releases (or any error).
 */
Release.find = function(query, callback) {
  Release.all(function(err, releases) {
    if (err) {
      var msg = 'Unable to query releases: ' + err.message;
      callback(new Error(msg));
    } else {
      var matches = releases.filter(function(release) {
        var match = true;
        for (var key in query) {
          match = release[key] === query[key];
          if (!match) {
            break;
          }
        }
        return match;
      });
      callback(null, matches);
    }
  });
};

/**
 * Query a single release (see the find method for query detail).
 * @param {Object} query A query object.
 * @param {function(Error, Release)} callback Called with a matching release (or
 *     null if none) or any error.
 */
Release.findOne = function(query, callback) {
  Release.find(query, function(err, releases) {
    callback(err, releases.length > 0 ? releases[0] : null);
  });
};

/**
 * Static access to state enum.
 * @enum {string}
 */
Release.states = {
  PENDING: 'pending',
  COMPLETE: 'complete'
};


/**
 * Create a release from its string representation.
 * @param {string} str The string representaton of a release.
 * @return {Release} The release.
 */
Release.fromString = function(str) {
  var options = JSON.parse(str);
  options.created = new Date(options.created);
  options.updated = new Date(options.updated);
  return new Release(options);
};


/**
 * Create a release given a path to a file.
 * @param {string} file Path to the string representation of a release.
 * @param {function(Error, Release)} callback Called with the release or any
 *     error.
 */
Release.fromFile = function(file, callback) {
  fs.readFile(file, function(err, data) {
    if (err) {
      callback(err);
    } else {
      var release;
      try {
        release = Release.fromString(String(data));
      } catch (err) {
        callback(err);
        return;
      }
      callback(null, release);
    }
  });
};


/**
 * Get the path to the directory containing a release.
 * @param {string} name Release name.
 * @return {string} Path to release dir.
 */
function getReleaseDir(name) {
  return path.join(config.releaseRoot, name);
}


/**
 * Get the path to the info file for the release.
 * @param {string} name Release name.
 * @return {string} Path to release info file.
 */
function getInfoFile(name) {
  return path.join(getReleaseDir(name), 'build', 'info.json');
}


/**
 * Get the path to the full build config file for the release.
 * @param {string} name Release name.
 * @return {string} Path to release full build config file.
 */
function getFullBuildConfig(name) {
  return path.join(getReleaseDir(name), 'config', 'ol.json');
}


/**
 * Get the path to the metadata file for the release.
 * @param {string} name Release name.
 * @return {string} Path to release metadata file.
 */
function getReleaseConfig(name) {
  return path.join(getReleaseDir(name) + '.json');
}


/**
 * Export the release constructor.
 */
module.exports = Release;

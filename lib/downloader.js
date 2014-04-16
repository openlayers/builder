var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var async = require('async');
var get = require('get-down');
var log = require('npmlog');
var rimraf = require('rimraf');

var Release = require('./models/release');
var config = require('../config.json');

var releaseDir = path.join(__dirname, '..', 'releases');

/** @type {string} */
log.level = 'verbose';


/**
 * Remove a directory associated with a pending download and then remove the
 * release doc itself.
 * @param {Release} release Pending download.
 * @param {function(Error)} callback Called when complete.
 */
function cleanPending(release, callback) {
  var dir = path.join(releaseDir, release.name);
  log.verbose('downloader', 'Cleaning pending ' + dir);
  rimraf(dir, function(err) {
    if (err) {
      callback(err);
    } else {
      release.remove(callback);
    }
  });
}


/**
 * Remove resources associated with pending downloads.
 * @param {function(Error)} callback Called when complete.
 */
function cleanAllPending(callback) {
  Release.find({state: Release.state.PENDING}, function(err, releases) {
    if (err) {
      callback(err);
    } else {
      async.each(releases, cleanPending, callback);
    }
  });
}


/**
 * Remove release directories for which there is not a corresponding release
 * doc in the database.
 * @param {function(Error)} callback Called when complete.
 */
function cleanAllOrphaned(callback) {
  fs.readdir(releaseDir, function(err, entries) {
    if (err) {
      callback(err);
    } else {
      async.filter(entries, function(name, include) {
        if (name === '_empty') {
          include(false);
        } else {
          Release.findOne({name: name}, function(err, release) {
            include(err || !release);
          });
        }
      }, function(orphans) {
        orphans = orphans.map(function(name) {
          return path.join(releaseDir, name);
        });
        if (orphans.length > 0) {
          log.verbose('downloader', 'Cleaning orphans ' + orphans);
        }
        async.each(orphans, rimraf, callback);
      });
    }
  });
}


/**
 * Remove release documents from the database for which there is no
 * corresponding release directory.
 * @param {function(Error)} callback Called when complete.
 */
function removeZombies(callback) {
  fs.readdir(releaseDir, function(err, entries) {
    if (err) {
      callback(err);
    } else {
      Release.find({}, function(err, releases) {
        async.each(releases, function(release, done) {
          if (entries.indexOf(release.name) >= 0) {
            done();
          } else {
            log.verbose('downloader', 'Removing zombie ' + release.name);
            release.remove(done);
          }
        }, callback);
      });
    }
  });
}


/**
 * Run the generate-symbols.js task in the installed release.
 * @param {string} dir Path to release.
 * @param {function(Error)} callback Called when complete.
 */
function generateSymbols(dir, callback) {
  log.verbose('downloader', 'Generating symbols ' + dir);
  var args = [path.join('tasks', 'generate-symbols.js')];
  var child = spawn('node', args, {cwd: dir});
  var errors = [];
  child.stderr.on('data', function(data) {
    errors.push(String(data));
  });
  child.on('close', function(code) {
    if (code) {
      var msg = 'generate-symbols.js failed: ' + dir + '\n' + errors.join('\n');
      callback(new Error(msg));
    } else {
      callback();
    }
  });
}


/**
 * Run `npm install` in the downloaded release.
 * @param {string} dir Path to release.
 * @param {function(Error)} callback Called when complete.
 */
function installRelease(dir, callback) {
  log.verbose('downloader', 'Installing ' + dir);
  var child = spawn('npm', ['install'], {cwd: dir});
  var errors = [];
  child.stderr.on('data', function(data) {
    errors.push(String(data));
  });
  child.stdout.on('data', function(data) {
    var str = String(data);
    log.silly('downloader', str);
  });
  child.on('close', function(code) {
    if (code) {
      var msg = 'npm install failed: ' + dir + '\n' + errors.join('\n');
      callback(new Error(msg));
    } else {
      generateSymbols(dir, callback);
    }
  });
}


/**
 * Download and extract a release archive, creating a download doc in the db.
 * @param {Object} config Release config with name and url properties.
 * @param {function(Error)} callback Called when complete.
 */
function downloadRelease(config, callback) {
  var release = new Release(config);
  release.save(function(err) {
    if (err) {
      callback(err);
    } else {
      var dir = path.join(releaseDir, release.name);
      fs.mkdir(dir, function(err) {
        if (err) {
          callback(err);
        } else {
          log.verbose('downloader', 'Downloading ' + release.url);
          var job = get(release.url, {dest: dir, extract: true});
          job.once('error', callback);
          job.on('progress', function(state) {
            if (state.retry) {
              var delay = Math.round(state.delay / 1000) + 's';
              log.verbose('downloader',
                  'Download failed, retrying again in ' + delay);
            } else {
              var progress = Math.floor(state.received / 1024) + 'K';
              if (state.percent) {
                progress = state.percent + '% (' + progress + ')';
              }
              log.verbose('downloader',
                  'Received ' + progress + ' of ' + release.url);
            }
          });
          job.once('end', function(dest) {
            installRelease(dir, function(err) {
              if (err) {
                callback(err);
              } else {
                release.state = Release.state.COMPLETE;
                release.save(callback);
              }
            });
          });
        }
      });
    }
  });
}


/**
 * Download all new releases.
 * @param {function(Error)} callback Called when complete.
 */
function downloadAllNew(callback) {
  async.each(config.releases, function(releaseConfig, done) {
    var dir = path.join(releaseDir, releaseConfig.name);
    fs.exists(dir, function(exists) {
      if (!exists) {
        downloadRelease(releaseConfig, done);
      } else {
        done();
      }
    });
  }, callback);
}


/**
 * Clean up any pending downloads, orphaned downloads, and zombie download docs
 * from the database.  Then download all new releases.
 * @param {function(Error)} callback Called when complete.
 */
exports.start = function(callback) {
  async.series([
    cleanAllPending,
    cleanAllOrphaned,
    removeZombies,
    downloadAllNew
  ], callback);
};

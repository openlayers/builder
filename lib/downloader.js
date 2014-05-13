var async = require('async');
var log = require('npmlog');

var Release = require('./release');
var config = require('../config.json');


/**
 * Remove an incomplete release.
 * @param {Release} release Incomplete release.
 * @param {function(Error)} callback Called when complete.
 */
function removeIncomplete(release, callback) {
  log.verbose('downloader', 'Removing outdated or incomplete release ' +
      release.name);
  release.remove(callback);
}


/**
 * Remove incomplete releases.
 * @param {function(Error)} callback Called when complete.
 */
function removeAllIncomplete(callback) {
  var lookup = {};
  config.releases.forEach(function(releaseConfig) {
    lookup[releaseConfig.name] = releaseConfig.url;
  });

  Release.find({}, function(err, releases) {
    if (err) {
      callback(err);
    } else {
      var incomplete = releases.filter(function(release) {
        return release.state !== Release.state.COMPLETE ||
            !(release.name in lookup) ||
            release.url !== lookup[release.name];
      });
      async.each(incomplete, removeIncomplete, callback);
    }
  });
}


/**
 * Create and save all new releases.
 * @param {function(Error)} callback Called when complete.
 */
function saveAllNew(callback) {
  Release.find({}, function(err, releases) {
    if (err) {
      callback(err);
    } else {
      var lookup = {};
      releases.forEach(function(release) {
        lookup[release.name] = release;
      });

      async.each(config.releases, function(releaseConfig, done) {
        if (releaseConfig.name in lookup) {
          done();
        } else {
          var release = new Release(releaseConfig);
          release.save(done);
        }
      }, callback);
    }
  });
}


/**
 * Clean up any pending or orphaned downloads.  Then download all new releases.
 * @param {function(Error)} callback Called when complete.
 */
exports.start = function(callback) {
  async.series([
    removeAllIncomplete,
    saveAllNew
  ], callback);
};

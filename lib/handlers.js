var boom = require('boom');
var log = require('npmlog');

var Release = require('./release');
var build = require('./build');

/**
 * Render the list of releases.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.getReleases = function(request, reply) {
  Release.find({}, function(err, releases) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    reply({
      releases: releases.sort(function(a, b) {
        return b.updated - a.updated;
      }).map(function(release) {
        release.link = reply.url('release', {release: release.name});
        return release;
      })
    });
  });
};


/**
 * Render the release page.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.getRelease = function(request, reply) {
  Release.findOne({name: request.params.release}, function(err, release) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    if (release) {
      release.getInfo(function(err2, data) {
        if (err2) {
          log.error('handlers', err2);
          reply(boom.internal('Failed to get release info'));
          return;
        }
        reply({
          release: release,
          symbols: data.symbols.map(function(symbol) {
            return {
              name: symbol.name,
              kind: symbol.kind,
              stability: symbol.stability
            };
          }),
          defines: data.defines
        });
      });
    } else {
      reply(boom.notFound('Release not found: ' + request.params.release));
    }
  });
};

/**
 * List all jobs for a release.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.getJobs = function(request, reply) {
  Release.findOne({name: request.params.release}, function(err, release) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    if (release) {
      build.getIndex(release, function(err2, index) {
        if (err2) {
          log.error('handlers', err2);
          reply(boom.internal('Failed to get build index'));
          return;
        }
        var jobs = Object.keys(index.jobs).map(function(id) {
          return {
            id: id,
            status: index.jobs[id].status,
            created: index.jobs[id].created,
            updated: index.jobs[id].updated,
            link: reply.url('job', {release: release.name, id: id})
          };
        });
        reply(jobs);
      });
    } else {
      reply(boom.notFound('Release not found: ' + request.params.release));
    }
  });
};

/**
 * Create a build job for a release.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.createJob = function(request, reply) {
  Release.findOne({name: request.params.release}, function(err, release) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    if (release) {
      build.getOrCreateJob(release, request.payload, function(err2, shortId) {
        if (err2) {
          if (err2 instanceof build.InvalidConfig) {
            reply(boom.badRequest(err2.message));
            return;
          }
          log.error('handlers', err2);
          reply(boom.internal('Failed to generate build'));
          return;
        }
        reply({id: shortId});
      });
    } else {
      reply(boom.notFound('Release not found: ' + request.params.release));
    }
  });
};

/**
 * Get info for a build job.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.getJob = function(request, reply) {
  Release.findOne({name: request.params.release}, function(err, release) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    if (release) {
      build.getIndex(release, function(err2, index) {
        if (err2) {
          log.error('handlers', err2);
          reply(boom.internal('Failed to get build index'));
          return;
        }
        if (!(request.params.id in index.jobs)) {
          reply(boom.notFound('Job not found: ' + request.params.id));
          return;
        }
        reply(index.jobs[request.params.id]);
      });
    } else {
      reply(boom.notFound('Release not found: ' + request.params.release));
    }
  });
};

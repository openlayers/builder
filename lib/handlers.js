var boom = require('boom');
var log = require('npmlog');

var Release = require('./release');

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
        release.link = reply.url('release', {name: release.name});
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
  Release.findOne({name: request.params.name}, function(err, release) {
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
      reply(boom.notFound('Release not found: ' + request.params.name));
    }
  });
};


/**
 * Build the release page.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.buildRelease = function(request, reply) {
  Release.findOne({name: request.params.name}, function(err, release) {
    if (err) {
      log.error('handlers', err);
      reply(boom.internal('Query failed'));
      return;
    }
    if (release) {
      release.getFullBuildConfig(function(err2, data) {
        if (err2) {
          log.error('handlers', err2);
          reply(boom.internal('Failed to get build config'));
          return;
        }
        reply(boom.internal('Build not implemented'));
      });
    } else {
      reply(boom.notFound('Release not found: ' + request.params.name));
    }
  });
};

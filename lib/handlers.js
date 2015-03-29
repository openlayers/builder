var fs = require('fs');
var path = require('path');

var hapi = require('hapi');
var log = require('npmlog');

var Release = require('./release');

var releaseDir = path.join(__dirname, '..', 'releases');


/**
 * Render the list of releases.
 * @param {hapi.Request} request Request.
 * @param {Function} reply Reply function.
 */
exports.getReleases = function(request, reply) {
  Release.find({}, function(err, releases) {
    if (err) {
      log.error('handlers', err);
      reply(hapi.error.internal('Query failed'));
      return;
    }
    reply({
      releases: releases.sort(function(a, b) {
        return b.updated - a.updated;
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
      reply(hapi.error.internal('Query failed'));
      return;
    }
    if (release) {
      release.getInfo(function(err, data) {
        if (err) {
          log.error('handlers', err);
          reply(hapi.error.internal('Failed to get release info'));
          return;
        }
        reply({
          release: release,
          symbols: data.symbols.map(function(symbol) {
            return {
              name: symbol.name,
              kind: symbol.kind,
              stability: symbol.stability
            }
          }),
          defines: data.defines
        });
      });
    } else {
      reply(hapi.error.notFound('Release not found'));
    }
  });
};

var joi = require('joi');

var handlers = require('./handlers');


/**
 * Route table.
 * @type {Array}
 */
module.exports = [
  {
    method: 'GET',
    path: '/',
    config: {
      id: 'root',
      handler: function(request, reply) {
        reply().redirect('/releases/');
      }
    }
  }, {
    method: 'GET',
    path: '/releases/',
    config: {
      id: 'releases',
      handler: handlers.getReleases
    }
  }, {
    method: 'GET',
    path: '/releases/{name}',
    config: {
      id: 'release',
      handler: handlers.getRelease
    }
  }, {
    method: 'POST',
    path: '/releases/{name}/build',
    config: {
      id: 'trigger-build',
      handler: handlers.buildRelease,
      validate: {
        payload: joi.object().keys({
          symbols: joi.array().items(joi.string()),
          defines: joi.array().items(joi.object().keys({
            name: joi.string(),
            value: joi.boolean()
          }))
        })
      }
    }
  }
];

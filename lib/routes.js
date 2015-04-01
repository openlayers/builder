var joi = require('joi');

var config = require('./config');
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
        reply({
          releases: reply.url('releases'),
          jobs: reply.url('jobs-tree')
        });
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
    path: '/releases/{release}',
    config: {
      id: 'release',
      handler: handlers.getRelease
    }
  }, {
    method: 'GET',
    path: '/jobs/',
    config: {
      id: 'jobs-tree',
      handler: handlers.getJobsTree
    }
  }, {
    method: 'GET',
    path: '/jobs/{release}/',
    config: {
      id: 'jobs',
      handler: handlers.getJobs
    }
  }, {
    method: 'POST',
    path: '/jobs/{release}/',
    config: {
      id: 'new-job',
      handler: handlers.createJob,
      validate: {
        payload: joi.object().keys({
          symbols: joi.array().items(joi.string()),
          defines: joi.object().pattern(/.*/, joi.boolean())
        })
      }
    }
  }, {
    method: 'GET',
    path: '/jobs/{release}/{id}',
    config: {
      id: 'job',
      handler: handlers.getJob
    }
  }, {
    method: 'GET',
    path: '/builds/{parts*}',
    config: {
      id: 'builds',
      handler: {
        directory: {
          path: config.buildRoot
        }
      }
    }
  }
];

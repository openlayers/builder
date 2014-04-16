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
      handler: function(request, reply) {
        reply().redirect('/releases');
      }
    }
  }, {
    method: 'GET',
    path: '/releases',
    config: {
      handler: handlers.getReleases
    }
  }, {
    method: 'GET',
    path: '/release/{release}',
    config: {
      handler: handlers.getRelease
    }
  }
];

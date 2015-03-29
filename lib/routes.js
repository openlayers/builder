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
    path: '/releases/{release}',
    config: {
      handler: handlers.getRelease
    }
  }
];

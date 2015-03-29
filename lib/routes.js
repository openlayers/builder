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
  }
];

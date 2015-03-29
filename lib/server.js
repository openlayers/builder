var hapi = require('hapi');

var handlers = require('./handlers');

var server = new hapi.Server();

// TODO: port from env
server.connection({port: 3000});

server.route({
  method: 'GET',
  path: '/releases/',
  handler: handlers.getReleases
});

server.route({
  method: 'GET',
  path: '/releases/{release}',
  handler: handlers.getRelease
});

/**
 * @type {hapi.Server}
 */
module.exports = server;

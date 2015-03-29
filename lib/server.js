var hapi = require('hapi');

var routes = require('./routes');

var server = new hapi.Server();

server.connection({
  port: 3000, // TODO: port from env
  routes: {
    cors: true
  }
});

server.route(routes);

/**
 * @type {hapi.Server}
 */
module.exports = server;

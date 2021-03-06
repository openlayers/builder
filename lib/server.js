var hapi = require('hapi');
var inert = require('inert');

var config = require('./config');
var routes = require('./routes');

var server = new hapi.Server();

server.register(inert, function(err) {
  if (err) {
    throw new Error('Failed to register inert plugin: ' + err.message);
  }
});

server.connection({
  port: config.port,
  host: config.host,
  address: config.address,
  routes: {
    cors: true
  }
});

server.route(routes);

server.decorate('reply', 'url', function(id, replace) {
  var route = server.lookup(id);
  if (!route) {
    throw new Error('No id found for route: ' + id);
  }
  var path = route.path;
  if (replace) {
    for (var key in replace) {
      path = path.replace('{' + key + '}', replace[key]);
    }
  }
  return (config.uri || server.info.uri) + path;
});

/**
 * @type {hapi.Server}
 */
module.exports = server;

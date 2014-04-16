var path = require('path');

var hapi = require('hapi');
var handlebars = require('handlebars');

var config = require('../config.json');
var routes = require('./routes');

var options = {
  views: {
    path: path.join(__dirname, 'templates'),
    engines: {
      html: 'handlebars'
    },
    layout: true,
    helpersPath: path.join(__dirname, 'templates', 'helpers'),
    isCached: false // TODO: dev env only
  }
};

// TODO: accept config
var server = hapi.createServer('localhost', 3001, options);

server.route(routes);


/**
 * @type {hapi.Server}
 */
module.exports = server;

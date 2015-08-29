var log = require('npmlog');

var config = require('./lib/config');
var downloader = require('./lib/downloader');
var server = require('./lib/server');


log.level = config.logLevel;


// Kick off any new downloads
downloader.start(function(err) {
  if (err) {
    console.error(err.stack || err);
    process.exit(1);
  }
});

// Start the server
server.start(function() {
  log.info('start', 'Server listening at ' + server.info.uri + '/');
});

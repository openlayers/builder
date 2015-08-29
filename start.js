var log = require('npmlog');

var config = require('./lib/config');
var downloader = require('./lib/downloader');
var server = require('./lib/server');


log.level = config.logLevel;


// Kick off any new downloads
downloader.start(function(err) {
  if (err) {
    process.stderr.write((err.stack || err.message) + '\n');
    process.exit(1);
  }
});

// Start the server
server.start(function() {
  log.info('start', 'Server listening at ' + server.info.uri + '/');
});

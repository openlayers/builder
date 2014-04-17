var log = require('npmlog');

var downloader = require('./lib/downloader');
var server = require('./lib/server');


/** @type {string} */
log.level = 'verbose';


// Kick off any new downloads
downloader.start(function(err) {
  if (err) {
    console.error(err.stack || err);
    process.exit(1);
  }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri + '/');
});

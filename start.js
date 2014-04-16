var mongoose = require('mongoose');

var downloader = require('./lib/downloader');
var server = require('./lib/server');

// Connect to the db
mongoose.connect('mongodb://localhost:27017/ol', function(err) {
  if (err) {
    console.error('Trouble connecting to Mongo: %s', err.message);
    process.exit(1);
  }
});

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

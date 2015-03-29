var path = require('path');

module.exports = {

  // internal port
  port: process.env.PORT || 3000,

  // path to releases
  releaseRoot: process.env.RELEASE_ROOT ||
      path.join(__dirname, '..', 'releases'),

  // log level
  logLevel: process.env.LOG_LEVEL || 'info',

  // external URI (e.g. http://example.com)
  uri: process.env.URI

};

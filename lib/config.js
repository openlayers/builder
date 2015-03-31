var path = require('path');

var releaseRoot = process.env.RELEASE_ROOT ||
    path.join(__dirname, '..', 'releases');

var buildRoot = process.env.BUILD_ROOT ||
    path.join(releaseRoot, '..', 'builds');

module.exports = {

  // internal port
  port: process.env.PORT || 3000,

  // path to releases
  releaseRoot: releaseRoot,

  // path to builds
  buildRoot: buildRoot,

  // log level
  logLevel: process.env.LOG_LEVEL || 'info',

  // external URI (e.g. http://example.com)
  uri: process.env.URI

};

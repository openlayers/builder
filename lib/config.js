var path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  releaseRoot: process.env.RELEASE_ROOT ||
      path.join(__dirname, '..', 'releases'),
  logLevel: process.env.LOG_LEVEL || 'info'
};

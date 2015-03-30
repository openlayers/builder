
var base64chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';

/**
 * Generate an identifier for a user generated build configuration.  The
 * identifier takes the form <symbols_hash>.<defines_hash> where the
 * symbols_hash and defines_hash are base 64 encoded values.  The symbols value
 * can be thought of a bit map where each bit determines if a particular symbol
 * is exported.  Likewise, the boolean defines can be represented as a binary
 * where each bit determines the value of the define.  These two values are
 * base64 encoded and concatenated with a dot to generate the build identifier.
 *
 * @param {Object} buildConfig A build configuration with an array of symbols
 *     and a defines object.
 * @param {Object} releaseInfo An info.json object for a release.
 * @return {string} An identifier for the build.
 */
exports.generateId = function(buildConfig, releaseInfo) {
  var symbolLookup = {};
  var id = '';
  var bits = 6;
  var i, ii, j, value, name;

  for (i = 0, ii = buildConfig.symbols.length; i < ii; ++i) {
    symbolLookup[buildConfig.symbols[i]] = true;
  }

  // encode exported symbols
  for (i = 0, ii = releaseInfo.symbols.length; i < ii; i += bits) {
    value = 0;
    for (j = 0; j < bits && i + j < ii; ++j) {
      if (symbolLookup[releaseInfo.symbols[i + j].name]) {
        value |= 1 << j;
      }
    }
    id += base64chars[value];
  }

  id += '.';

  // encode defines
  for (i = 0, ii = releaseInfo.defines.length; i < ii; i += bits) {
    value = 0;
    for (j = 0; j < bits && i + j < ii; ++j) {
      name = releaseInfo.defines[i + j].name;
      if (name in buildConfig.defines) {
        if (buildConfig.defines[name]) {
          value |= 1 << j;
        }
      } else if (releaseInfo.defines[i + j].default) {
        value |= 1 << j;
      }
    }
    id += base64chars[value];
  }

  return id;
};

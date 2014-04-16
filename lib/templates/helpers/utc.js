

/**
 * Converts date to UTC string.
 * @param {Date} date Date to format.
 * @return {string} UTC string.
 */
module.exports = function(date) {
  return date.toUTCString();
};

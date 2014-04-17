

/**
 * Converts date to an ISO 8601 string.
 * @param {Date} date Date to format.
 * @return {string} ISO 8601 string.
 */
module.exports = function(date) {
  return date.toISOString();
};

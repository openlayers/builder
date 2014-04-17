var moment = require('moment');


/**
 * Generates an "ago" string given a date.
 * @param {Date} date Input date.
 * @return {string} Time from now.
 */
module.exports = function(date) {
  return moment(date).fromNow();
};

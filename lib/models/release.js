var mongoose = require('mongoose');

var Schema = mongoose.Schema;


/**
 * States enum
 * @enum {string}
 */
var state = {
  PENDING: 'pending',
  COMPLETE: 'complete'
};


/**
 * Release schema.
 * @type {Schema}
 */
var ReleaseSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },
  url: {
    type: String,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date
  },
  state: {
    type: String,
    required: true,
    enum: Object.keys(state).map(function(key) {
      return state[key];
    }),
    default: state.PENDING
  }
});


ReleaseSchema.pre('save', function(done) {
  this.updated = new Date();
  done();
});


/**
 * Static access to states enum.
 * @enum {string}
 */
ReleaseSchema.statics.state = state;


/**
 * Release constructor.
 * @constructor
 * @param {Object} config Release properties.
 */
module.exports = mongoose.model('Release', ReleaseSchema);

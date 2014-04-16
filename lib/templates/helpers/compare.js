

/**
 * Comparison helper.  Example use:
 *     {{#compare foo ">" bar}}
 *       foo is bigger
 *     {{else}}
 *       bar is at least as big
 *     {{/compare}}

 * @param {Object|number|string} left Left operand.
 * @param {string} operator Operator.  If not provided, "==" is used.
 * @param {Object|number|string} right Right operand.
 * @param {Options} options Options object (not used).
 * @return {string} The resulting block.
 * @this {Object} Template context.
 */
module.exports = function(left, operator, right, options) {
  if (arguments.length < 3) {
    throw new Error('Helper "compare" needs at least 2 arguments');
  }
  if (arguments.length === 3) {
    options = right;
    right = operator;
    operator = '==';
  }

  var operators = {
    '==': function(l, r) {return l == r;},
    '===': function(l, r) {return l === r;},
    '!=': function(l, r) {return l != r;},
    '!==': function(l, r) {return l !== r;},
    '<': function(l, r) {return l < r;},
    '>': function(l, r) {return l > r;},
    '<=': function(l, r) {return l <= r;},
    '>=': function(l, r) {return l >= r;},
    'typeof': function(l, r) {return typeof l === r;}
  };

  if (!(operator in operators)) {
    throw new Error('Unrecognized operator for "compare" helper: ' + operator);
  }

  var block;
  if (operators[operator](left, right)) {
    block = options.fn(this);
  } else {
    block = options.inverse(this);
  }
  return block;
};

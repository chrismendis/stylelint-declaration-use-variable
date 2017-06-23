var stylelint = require('stylelint');

var ruleName = 'chrismendis/declaration-use-variable-or-custom-fn';

var messages = stylelint.utils.ruleMessages(ruleName, {
    expected: function expected(property) {
        return 'Expected a variable or function for \"' + property + '\".';
    },
    expectedPresent: function expectedPresent(property, variable) {
        return 'Expected a variable (maybe ' + variable + ') or function for \"' + property + '\".';
    }
});

// Store the variables in object
var variables = {};

/**
 * Compares the declaration with regex pattern
 * to verify the usage of variable
 *
 * @param  {string} val
 * @return {bool}
 */
function checkValue(val, functionNames) {
    // Regex for checking
    // scss variable starting with '$'
    // map-get function in scss
    // less variable starting with '@'
    // custom properties starting with '--' or 'var'
    // user-specified function names
    // var regEx = /^(\$)|(map-get)|(\@)|(--)|(var)|(palette)/g;
    functionNames = functionNames || [];
    var preparedFnNames = functionNames.map(function (name, i) {
      return (i === 0 ? "|(" : "(") + name + ")"
    });
    var regEx = new RegExp("^(\\$)|(map-get)|(\\@)|(--)|(var)" + preparedFnNames.join("|"), "g");

    // color functions starting with 'color('
    if (val.indexOf('color(') > -1) {
      return true;
    }
    return regEx.test(val);
}

/**
 * Checks the value and if its present in variables object
 * returns the respective variable
 *
 * @param  {string}
 * @return {string|bool}
 */
function checkPresentVariable(val) {
    return variables[val] ? variables[val] : false;
}

/**
 * Checks the defined property in (css|scss|less) with the
 * test string or regex defined in stylelint config
 *
 * @param  {string} value
 * @param  {string|regex} comparison
 * @return {bool}
 */
function testAgaintString(prop, value, comparison, functionNames) {
    var comparisonIsRegex = comparison[0] === "/" && comparison[comparison.length - 1] === "/";

    // if prop is a variable do not run check
    // and add it in the variables object for later check
    // and return, since it would be a variable declaration
    // not a style property declaration
    if (checkValue(prop, functionNames)) {
        variables[value] = prop;
        return;
    }

    if (comparisonIsRegex) {
        var valueMatches = new RegExp(comparison.slice(1, -1)).test(prop);
        return valueMatches;
    }

    return prop == comparison;
}

/**
 * Checks the test expression with css declaration
 *
 * @param  {string} prop
 * @param  {string|array} comparison
 * @return {bool}
 */
function checkProp(prop, value, comparison, functionNames) {
    if (Array.isArray(comparison)) {
        for (var input of comparison) {
            if (testAgaintString(prop, value, input, functionNames)) return true;
        }
        return false;
    } else {
        return testAgaintString(prop, value, comparison, functionNames);
    }
}

module.exports = stylelint.createPlugin(ruleName, function(options) {
    options = options || '';

    return function(root, result) {
        var validOptions = stylelint.utils.validateOptions({
            ruleName: ruleName,
            result: result,
            actual: options,
        });

        if (!validOptions) {
            return;
        }

        var hasSimpleOptions = Array.isArray(options) || typeof options === "string";
        var comparison = hasSimpleOptions ? options : options.props;
        var functionNames = hasSimpleOptions ? [] : options.functionNames;

        root.walkDecls(function(statement) {
            if (checkProp(statement.prop, statement.value, comparison, functionNames)  && checkPresentVariable(statement.value) && !checkValue(statement.value, functionNames)) {
                stylelint.utils.report({
                    ruleName: ruleName,
                    result: result,
                    node: statement,
                    message: messages.expectedPresent(statement.prop, checkPresentVariable(statement.value))
                });
            } else if (checkProp(statement.prop, statement.value, comparison, functionNames) && !checkValue(statement.value, functionNames)) {
                stylelint.utils.report({
                    ruleName: ruleName,
                    result: result,
                    node: statement,
                    message: messages.expected(statement.prop)
                });
            }

        });
    };
});

module.exports.ruleName = ruleName;
module.exports.messages = messages;

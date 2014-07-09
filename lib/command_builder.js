/**
 *  Lets you construct an object with methods that enforce a required argument length,
 *  and can print usage information for all of the available methods.
 *
 *  Usage:
 *  var builder = require(<this_file>).newCommandBuilder();
 *  builder.defineCommand('foo', 0, 'Prints the word foo', function() { console.log('foo'); });
 *  builder.defineCommand('greet', 1, 'Greets the given person', function(name) { console.log('Hello, ' + name); });
 *
 *  Once you've defined all your commands, build your command object:
 *  var commands = builder.build();
 *
 *  And now you can invoke methods that enforce their argument length:
 *  commands.greet(); // prints an error and exits
 *  commands.printUsage();
 *
 */

var ERROR = require('../lib/errors');
var PRINT_USAGE_COMMAND_NAME = 'printUsage';

module.exports = {
  newCommandBuilder: function () {
    var commands = {
    };
    var usageHints = {};

    function printUsage() {
      console.log('usage: hostess [command] ...');
      console.log('');
      console.log('Commands:');
      usageHints.forEach(function(usageHint) {
        console.log('  ' + usageHint);
      });
      console.log('');
    }

    return {
      defineCommand: function(commandName, usageHint, argumentCount, fn) {
        if (commands.hasOwnProperty(commandName) || commandName == PRINT_USAGE_COMMAND_NAME) {
          throw 'Command named ' + commandName + ' already exists.';
        }
        commands[commandName] = function(commandArgs) {
          //  Ensure we've been invoked with the proper number of arguments
          if (commandArgs.length != argumentCount) {
            console.error('Wrong number of arguments for ' + commandName + '.');
            console.log('');
            printUsage();
            process.exit(ERRORS.WRONG_ARGUMENT_COUNT);
          }

          //  Run the actual command
          fn.apply(this, commandArgs);
        };
      },
      build: function() {
        var obj = {};
        obj[PRINT_USAGE_COMMAND_NAME] = printUsage;

        Object.keys(commands).forEach(function(commandName) {
          obj[commandName] = commands[commandName].bind(obj);
        });

        return obj;
      },
    };
  }
};

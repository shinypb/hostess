var builder = require('../lib/command_builder').newCommandBuilder();
var ERRORS = require('../lib/errors');

var fs = require('fs');
var path = require('path');
var kexec = require('kexec');

var FILE_READ_OPTIONS = { encoding: 'utf8' };
var HOSTESS_DIR = process.env.HOSTESS_DIR || (process.env.HOME + '/.hostess');
var HOSTS_FILENAME = '/etc/hosts';
var ORIGINAL_SET_NAME = 'original';
var README_FILENAME = '/README';
var SET_FILE_EXTENSION_REGEX = /\.set$/;

var TEMPLATE_SET = [
  '# Host set created by hostess',
  '127.0.0.1 localhost',
  '255.255.255.255 broadcasthost',
  '::1             localhost',
  'fe80::1%lo0 localhost'
].join("\n");
var TEMPLATE_README = 'Created by Hostess\nhttps://github.com/shinypb/hostess\n';

function validateEnvironment() {
  ['EDITOR', 'HOME'].forEach(function(variableName) {
    if (!process.env[variableName]) {
      console.error("Missing " + variableName + " environment variable.");
      process.exit(ERRORS.INVALID_ENVIRONMENT);
    }
  });
}

function ensureHostessDirectoryExists() {
  if (fs.existsSync(HOSTESS_DIR)) {
    var stats = fs.lstatSync(HOSTESS_DIR);
    if (!stats.isDirectory()) {
      console.error('Configuration path ' + HOSTESS_DIR + ' exists, but is not a directory.');
      process.exit(ERRORS.DIRECTORY_IS_A_FILE);
    }
  } else {
    fs.mkdirSync(HOSTESS_DIR);
    if (!fs.existsSync(HOSTESS_DIR)) {
      console.log('Failed to create configuration directory at ' + HOSTESS_DIR);
      process.exit(ERRORS.DIRECTORY_CREATE_FAILED);
    }

    //  Add a readme
    fs.writeFileSync(HOSTESS_DIR + '/' + README_FILENAME, TEMPLATE_README);

    //  Copy the current /etc/hosts file in there
    var originalHostsData = fs.readFileSync(HOSTS_FILENAME);
    fs.writeFileSync(filenameForSet(ORIGINAL_SET_NAME), originalHostsData);
  }
}

function availableSets() {
  return fs.readdirSync(HOSTESS_DIR).filter(function(filename) {
    return !!filename.match(SET_FILE_EXTENSION_REGEX);
  }).map(function(filename) {
    return filename.replace(SET_FILE_EXTENSION_REGEX, '');
  });
}

function filenameForSet(setName) {
  return HOSTESS_DIR + '/' + setName + '.set';
}

function setExists(setName) {
  return availableSets().indexOf(setName) >= 0;
}

function ensureSetExists(setName) {
  if (!setExists(setName)) {
    console.error("There is no set called " + setName + ".");
    console.error("Try 'hostess create " + setName + "' first?");
    return process.exit(ERRORS.SET_NOT_FOUND);
  }
}

function getSetData(setName) {
  return fs.readFileSync(filenameForSet(setName), FILE_READ_OPTIONS);
}

builder.defineCommand(
  'create',
  'hostess create [name]: creates a new /etc/hosts set with the given name',
  1,
  function(setName) {
    if (setExists(setName)) {
      console.error("There is already a set with that name.");
      console.error("Try 'hostess edit " + setName + "' instead?");
      return process.exit(ERRORS.SET_ALREDY_EXISTS);
    }

    fs.writeFileSync(filenameForSet(setName), TEMPLATE_SET);
    this.edit([setName]);

    console.log('Created a new called ' + setName + '.');
    console.log("Use 'hostess set " + setName + "' to activate it.");
  }
);

builder.defineCommand(
  'delete',
  'hostess delete [name] : deletes the /etc/hosts set with the given name',
  1,
  function(setName) {
    ensureSetExists(setName);

    fs.unlinkSync(filenameForSet(setName));
  }
);

builder.defineCommand(
  'edit',
  'hostess edit [name]   : edits the /etc/hosts set with the given name',
  1,
  function(setName) {
    ensureSetExists(setName);

    kexec(process.env.EDITOR, [filenameForSet(setName)]);
  }
);

builder.defineCommand(
  'list',
  'hostess list          : shows all available set names',
  0,
  function() {
    console.log(availableSets().sort().join('\n'));
  }
);

builder.defineCommand(
  'show',
  'hostess show [name]   : prints the contents of the given /etc/hosts set,',
  1,
  function(setName) {
    ensureSetExists(setName);
    console.log(getSetData(setName));
  }
);

builder.defineCommand(
  'use',
  'hostess use [name]    : uses the /etc/hosts set with the given name',
  1,
  function(setName) {
    ensureSetExists(setName);
    if (process.getuid() !== 0) {
      console.log("Try 'sudo hostess use " + setName + "' instead.");
      process.exit(ERRORS.NOT_ROOT);
    }

    fs.writeFileSync(HOSTS_FILENAME, getSetData(setName));
  }
);

var commands = builder.build();
commands.run = function(commandName, args) {
  validateEnvironment();
  ensureHostessDirectoryExists();
  commands[commandName].call(this, args);
};

module.exports = commands;

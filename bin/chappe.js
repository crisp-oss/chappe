#!/usr/bin/env node

/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


// IMPORTS

var version  = require("../package.json").version;
var args     = require("yargs").argv;


// CONSTANTS

var STATES            = {
  failed : false
};

var CONTEXT_DEFAULTS  = {
  default : {
    config : "./config.json",
    assets : "./assets",
    data   : "./data",
    env    : "production"
  },

  example : {
    "crisp-docs" : {
      config : "./examples/crisp-docs/config.json",
      assets : "./examples/crisp-docs/assets",
      data   : "./examples/crisp-docs/data",
      env    : "development"
    }
  }
};

var ACTIONS_AVAILABLE = [
  "build",
  "clean",
  "watch",
  "lint"
];

var ENV_AVAILABLE     = [
  "development",
  "production"
];


// METHODS

function run() {
  // Run help?
  if (args.help) {
    return run_help();
  }

  // Run version?
  if (args.version) {
    return run_version();
  }

  // Run default (clean or build)
  run_default();
}

function run_help() {
  console.log(
    "Builds given Chappe documentation resources into static assets.\n\n"  +
    "Available arguments:\n"                                               +
      (help_argument("config") + "\n")                                     +
      (help_argument("assets") + "\n")                                     +
      (help_argument("data")   + "\n")                                     +
      help_argument("env")
  );

  process.exit(0);
}

function run_version() {
  console.log("Chappe CLI v" + version);

  process.exit(0);
}

function run_default() {
  // Acquire task from action
  var _task = acquire_action();

  // Acquire context
  global.CONTEXT = acquire_context();

  console.log(
    ("Chappe will " + _task + " docs with context:"), global.CONTEXT
  );

  // Import Gulp
  var gulp = require("gulp");

  // Configure Gulp logging
  setup_gulp_logging(gulp);

  // Import the Gulpfile
  require("../gulpfile.js");

  // Build docs
  gulp.start(_task);
}

function help_argument(name) {
  return (
    " --" + name + "  (defaults to: '" + CONTEXT_DEFAULTS.default[name] + "')"
  );
}

function acquire_action() {
  var _action;

  for (var _i = 0; _i < ACTIONS_AVAILABLE.length; _i++) {
    var _cur_action = ACTIONS_AVAILABLE[_i];

    if (process.argv.includes(_cur_action) === true) {
      _action = _cur_action;

      break;
    }
  }

  return (_action || "build");
}

function acquire_context() {
  // Acquire defaults
  var _defaults = (
    args.example ?
      CONTEXT_DEFAULTS.example[args.example] : CONTEXT_DEFAULTS.default
  );

  if (!_defaults) {
    throw new Error(
      "Defaults could not be acquired. Did you specify a non-existing example?"
    );
  }

  // Generate context
  var _context = {
    config : (args.config || _defaults.config),
    assets : (args.assets || _defaults.assets),
    data   : (args.data   || _defaults.data),
    env    : (args.env    || _defaults.env)
  };

  // Validate context
  if (ENV_AVAILABLE.includes(_context.env) !== true) {
    throw new Error(
      "Environment value not recognized: " + _context.env
    );
  }

  return _context;
}

function setup_gulp_logging(instance) {
  process.once("exit", function(code) {
    switch (code) {
      case 0: {
        // Re-exit with forced error
        if (STATES.failed === true) {
          process.exit(1);
        }

        break;
      }

      case 1: {
        // Self-kill, because apparently event if calling process.exit(1), the \
        //   process stays active and sticky in certain cases.
        process.kill(process.pid, "SIGINT");

        break;
      }
    }
  });

  instance.on("err", function() {
    STATES.failed = true;
  });

  instance.on("task_start", function(event) {
    console.log(
      "Starting '" + event.task + "'..."
    );
  });

  instance.on("task_stop", function(event) {
    console.log(
      "Finished '" + event.task + "'"
    );
  });

  instance.on("task_err", function(event) {
    console.log(
      ("Error in: '" + event.task + "'"), event
    );

    process.exit(1);
  });

  instance.on("task_not_found", function() {
    console.log(
      "Task not found: '" + event.task + "'"
    );

    process.exit(1);
  });
}


// CALLS

run();

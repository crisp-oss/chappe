#!/usr/bin/env node

/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


// IMPORTS

var fs        = require("fs");
var path      = require("path");

var ora       = require("ora");

var version   = require("../package.json").version;
var args      = require("yargs").argv;


// CONSTANTS

var CONTEXT_DEFAULTS  = {
  default : {
    config : "./config.json",
    assets : "./assets",
    data   : "./data",
    dist   : "./dist",
    temp   : "./.chappe",
    env    : "production"
  },

  example : {
    "crisp-docs" : {
      config : "./examples/crisp-docs/config.json",
      assets : "./examples/crisp-docs/assets",
      data   : "./examples/crisp-docs/data",
      dist   : "./dist",
      temp   : "./.chappe",
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

var SPINNER_SUCCESSES = {
  default : {
    method : "succeed",
    text   : "Success!"
  },

  build   : {
    method : "succeed",
    text   : "Done!"
  },

  watch   : {
    method : "start",
    text   : "Watching..."
  }
};

var PATH_EXPAND_KEYS  = [
  "config",
  "assets",
  "data",
  "dist",
  "temp"
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

    "Available actions:\n"                                                 +
      (help_actions(ACTIONS_AVAILABLE) + "\n\n")                           +

    "Available arguments:\n"                                               +
      (help_argument("config") + "\n")                                     +
      (help_argument("assets") + "\n")                                     +
      (help_argument("data")   + "\n")                                     +
      (help_argument("dist")   + "\n")                                     +
      (help_argument("temp")   + "\n")                                     +
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

  // Dump banner
  console.log(dump_banner());

  // Acquire context
  global.CONTEXT = acquire_context();

  console.log(
    ("Chappe will " + _task + " docs with context:\n")  +
      (dump_context(global.CONTEXT) + "\n")
  );

  // Setup spinner
  var spinner = ora({
    text  : "Working...\n",
    color : "cyan"
  });

  // Setup error traps
  setup_error_traps(spinner);

  // Import the Gulpfile
  var gulpfile = require("../gulpfile.js");

  // Start spinner
  spinner.start();

  // Build docs
  gulpfile[_task](function(error) {
    // Any error occured?
    if (error) {
      spinner.fail("Error:");

      console.log(error);

      process.exit(1);
    } else {
      var _success_rules = (
        SPINNER_SUCCESSES[_task] || SPINNER_SUCCESSES.default
      );

      spinner[_success_rules.method](_success_rules.text);
    }
  });
}

function help_actions(actions) {
  var _actions = actions.map(function(action) {
    return (" " + action);
  });

  return _actions.join("\n");
}

function help_argument(name) {
  return (
    " --" + name + "  (defaults to: '" + CONTEXT_DEFAULTS.default[name] + "')"
  );
}

function dump_banner() {
  var _buffer = (
    fs.readFileSync(path.join(__dirname, "../.banner"))
  );

  return _buffer.toString();
}

function dump_context(context) {
  var _context = Object.keys(context).map(function(key) {
    return (" " + key + " -> " + context[key]);
  });

  return _context.join("\n");
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
    dist   : (args.dist   || _defaults.dist),
    temp   : (args.temp   || _defaults.temp),
    env    : (args.env    || _defaults.env)
  };

  // Validate context
  if (ENV_AVAILABLE.includes(_context.env) !== true) {
    throw new Error(
      "Environment value not recognized: " + _context.env
    );
  }

  // Expand context paths
  var _base_path = process.cwd();

  PATH_EXPAND_KEYS.forEach(function(key) {
    // Path is not already in absolute format? (convert to absolute)
    if (path.isAbsolute(_context[key]) !== true) {
      _context[key] = (
        path.join(_base_path, _context[key])
      );
    }
  });

  return _context;
}

function setup_error_traps(spinner) {
  process.once("exit", function(code) {
    if (code > 0) {
      // Self-kill, because apparently event if calling process.exit(1), the \
      //   process stays active and sticky in certain cases (due to registered \
      //   listeners and file descriptors in some Gulp libraries).
      // Warning: this is a bit hacky!
      process.exitCode = code;

      process.kill(process.pid, "SIGKILL");
    }
  });

  process.on("uncaughtException", function(error) {
    spinner.fail("Failed:");

    console.log(
      (error && error.context) ? error.context : error
    );

    process.exit(1);
  });
}


// CALLS

run();

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
    "acme-docs" : {
      config : "./examples/acme-docs/config.json",
      assets : "./examples/acme-docs/assets",
      data   : "./examples/acme-docs/data",
      dist   : "./dist",
      temp   : "./.chappe",
      env    : "development"
    }
  }
};

var ACTIONS_AVAILABLE = [
  "clean",
  "build",
  "lint",
  "watch"
];

var ACTIONS_LOGGING   = [
  "watch"
];

var SPINNER_SUCCESSES = {
  default : {
    method : "succeed",
    text   : "Success!"
  },

  clean   : {
    method : "succeed",
    text   : "Cleaned up."
  },

  build   : {
    method : "succeed",
    text   : "Build done!"
  },

  lint    : {
    method : "succeed",
    text   : "Lint passed."
  },

  watch   : {
    method : "start",
    text   : "Watching...\n"
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

// jscs:disable disallowIdentifierNames

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
  var _has_output = (args.quiet ? false : true);

  // Acquire task from action
  var _task = acquire_action();

  // Dump banner?
  if (_has_output === true) {
    console.log(dump_banner());
  }

  // Acquire context
  global.CONTEXT = acquire_context();

  if (_has_output === true) {
    console.log(
      ("Chappe will " + _task + " docs with context:\n")  +
        (dump_context(global.CONTEXT) + "\n")
    );
  }

  // Setup spinner
  var spinner = ora({
    text  : "Working...\n",
    color : "cyan"
  });

  // Setup error traps
  setup_error_traps(spinner);

  // Setup Gulp logging? (only for certain actions)
  if (ACTIONS_LOGGING.includes(_task) === true) {
    setup_gulp_logging(
      require("gulp")
    );
  }

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
  // Generate bundle name
  var _bundle_name = ("Chappe v" + version);

  // Read banner file
  var _buffer = (
    fs.readFileSync(path.join(__dirname, "../.banner"))
  );

  // Convert banner to string and inject bundle name
  var _banner = _buffer.toString().replace("{{bundle}}", _bundle_name);

  return _banner;
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
  // Notice: the values are temporarily represented as arrays, to ease with \
  //   data normalization steps.
  var _context = {
    config : (args.config  || _defaults.config).split(","),
    assets : [(args.assets || _defaults.assets)],
    data   : [(args.data   || _defaults.data)],
    dist   : [(args.dist   || _defaults.dist)],
    temp   : [(args.temp   || _defaults.temp)],
    env    : [(args.env    || _defaults.env)]
  };

  // Expand context paths
  var _base_path = process.cwd();

  PATH_EXPAND_KEYS.forEach(function(key) {
    var _context_values = _context[key];

    for (var _i = 0; _i < _context_values.length; _i++) {
      // Path is not already in absolute format? (convert to absolute)
      if (path.isAbsolute(_context_values[_i]) !== true) {
        _context_values[_i] = (
          path.join(_base_path, _context_values[_i])
        );
      }
    }
  });

  // Re-join context values as bare strings (from lists)
  for (var _key in _context) {
    _context[_key] = _context[_key].join(",");
  }

  // Validate final context
  if (ENV_AVAILABLE.includes(_context.env) !== true) {
    throw new Error(
      "Environment value not recognized: " + _context.env
    );
  }

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

function setup_gulp_logging(instance) {
  instance.on("start", function(event) {
    console.log(
      "Starting '" + event.name + "'..."
    );
  });

  instance.on("stop", function(event) {
    console.log(
      "Finished '" + event.name + "'"
    );
  });

  instance.on("error", function(event) {
    console.log(
      ("Error in: '" + event.name + "'"), event.error
    );

    process.exit(1);
  });
}

// jscs:enable disallowIdentifierNames


// CALLS

run();

#!/usr/bin/env node

/*
 * chappe
 *
 * Copyright 2021, Crisp IM SARL
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


"use strict";


var fs       = require("fs");
var path     = require("path");

var ora      = require("ora");

var version  = require("../package.json").version;
var args     = require("yargs").argv;


/**
 * Chappe CLI
 * @class
 * @classdesc Chappe CLI class.
 */
class ChappeCLI {
  /**
   * Constructor
   */
  constructor() {
    // Constants
    this.__context_defaults  = {
      default : {
        config : "./config.json",
        assets : "./assets",
        data   : "./data",
        dist   : "./dist",
        temp   : "./.chappe",
        env    : "production",
        host   : "localhost",
        port   : 8040
      },

      example : {
        config : "./examples/{{target}}/config.json",
        assets : "./examples/{{target}}/assets",
        data   : "./examples/{{target}}/data",
        dist   : "./dist",
        temp   : "./.chappe",
        env    : "development",
        host   : "localhost",
        port   : 8040
      }
    };

    this.__actions_available = [
      "build",
      "clean",
      "watch",
      "serve",
      "lint"
    ];

    this.__actions_logging   = [
      "watch",
      "serve"
    ];

    this.__actions_no_aborts = [
      "watch",
      "serve"
    ];

    this.__spinner_successes = {
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

      serve   : {
        method : "start",
        text   : "Now listening..."
      },

      watch   : {
        method : "start",
        text   : "Watching...\n"
      }
    };

    this.__path_expand_keys  = [
      "config",
      "assets",
      "data",
      "dist",
      "temp"
    ];

    this.__env_available     = [
      "development",
      "production"
    ];

    // Storage
    this.__has_setup_gulp_logging = false;
  }


  // jscs:disable disallowIdentifierNames


  /**
   * Runs the class
   * @public
   * @return {undefined}
   */
  run() {
    // Run help?
    if (args.help) {
      return this.__run_help();
    }

    // Run version?
    if (args.version) {
      return this.__run_version();
    }

    // Run default (clean or build)
    this.__run_default();
  }


  /**
   * Runs help
   * @private
   * @return {undefined}
   */
  __run_help() {
    console.log(
      "Builds given Chappe documentation resources into static assets.\n\n"  +

      "Available actions:\n"                                                 +
        (this.__format_help_actions(this.__actions_available) + "\n\n")      +

      "Available arguments:\n"                                               +
        (this.__format_help_argument("config") + "\n")                       +
        (this.__format_help_argument("assets") + "\n")                       +
        (this.__format_help_argument("data")   + "\n")                       +
        (this.__format_help_argument("dist")   + "\n")                       +
        (this.__format_help_argument("temp")   + "\n")                       +
        (this.__format_help_argument("env")    + "\n")                       +
        (this.__format_help_argument("host")   + "\n")                       +
        (this.__format_help_argument("port")   + "\n\n")                     +

      "Other arguments:\n"                                                   +
        (this.__format_help_argument("quiet") + "\n")                        +
        (this.__format_help_argument("verbose") + "\n")                      +
        this.__format_help_argument("example")
    );

    process.exit(0);
  }


  /**
   * Runs version
   * @private
   * @return {undefined}
   */
  __run_version() {
    console.log("Chappe CLI v" + version);

    process.exit(0);
  }


  /**
   * Runs default
   * @private
   * @return {undefined}
   */
  __run_default() {
    let _has_output = (
      (args.quiet && !args.verbose) ? false : true
    );

    // Acquire task from action
    let _task = this.__acquire_action();

    // Dump banner?
    if (_has_output === true) {
      console.log(this.__dump_banner());
    }

    // Acquire context
    global.CONTEXT = this.__acquire_context(_task);

    if (_has_output === true) {
      console.log(
        ("Chappe will " + _task + " docs with context:\n")  +
          (this.__dump_context(global.CONTEXT) + "\n")
      );
    }

    // Setup spinner
    let _spinner = ora({
      text  : "Working...\n",
      color : "cyan"
    });

    // Import Gulp instance
    let _gulp = require("gulp");

    // Setup error traps
    this.__setup_error_traps(_gulp, _spinner, _task);

    // Setup Gulp logging? (pre-task mode, only if verbose)
    if (args.verbose) {
      this.__setup_gulp_logging(_gulp, _spinner);
    }

    // Import the Gulpfile
    let _gulpfile = require("../gulpfile.js");

    // Start spinner
    _spinner.start();

    // Build docs
    _gulpfile[_task]((error) => {
      // Any error occured?
      if (error) {
        // Throw error and stop spinner
        _spinner.fail("Error:");

        console.log(error);

        _spinner.stop();

        process.exit(1);
      } else {
        // Show success spinner (depending on task success rule)
        let _success_rules = (
          this.__spinner_successes[_task] || this.__spinner_successes.default
        );

        _spinner[_success_rules.method](_success_rules.text);

        // Setup Gulp logging? (post-task mode, only for certain actions)
        if (this.__actions_logging.includes(_task) === true) {
          this.__setup_gulp_logging(_gulp, _spinner);
        }
      }
    });
  }


  /**
   * Formats help actions
   * @private
   * @param  {object} actions
   * @return {string} Formatted help actions
   */
  __format_help_actions(actions) {
    let _actions = actions.map((action) => {
      return (" " + action);
    });

    return _actions.join("\n");
  }


  /**
   * Formats help argument
   * @private
   * @param  {string} name
   * @return {string} Formatted help argument
   */
  __format_help_argument(name) {
    let _argument = (" --" + name);

    // Append default value? (if any)
    let _default_value = this.__context_defaults.default[name];

    if (typeof _default_value !== "undefined") {
      _argument += ("  (defaults to: '" + _default_value + "')");
    }

    return _argument;
  }


  /**
   * Dumps the banner
   * @private
   * @return {string} Dumped banner
   */
  __dump_banner() {
    // Generate bundle name
    let _bundle_name = ("Chappe v" + version);

    // Read banner file
    let _buffer = (
      fs.readFileSync(path.join(__dirname, "../.banner"))
    );

    // Convert banner to string and inject bundle name
    let _banner = _buffer.toString().replace("{{bundle}}", _bundle_name);

    return _banner;
  }


  /**
   * Dumps the context
   * @private
   * @param  {object} context
   * @return {string} Dumped context
   */
  __dump_context(context) {
    let _context = Object.keys(context).map((key) => {
      return (" " + key + " -> " + context[key]);
    });

    return _context.join("\n");
  }


  /**
   * Acquires current action
   * @private
   * @return {string} Current action
   */
  __acquire_action() {
    let _action;

    for (let _i = 0; _i < this.__actions_available.length; _i++) {
      let _cur_action = this.__actions_available[_i];

      if (process.argv.includes(_cur_action) === true) {
        _action = _cur_action;

        break;
      }
    }

    return (_action || "build");
  }


  /**
   * Acquires current context
   * @private
   * @param  {string} task
   * @return {object} Current context
   */
  __acquire_context(task) {
    // Acquire defaults
    let _defaults = (
      this.__context_defaults[(args.example ? "example" : "default")]
    );

    // Inject target in defaults?
    if (args.example) {
      _defaults = this.__inject_defaults_target(
        _defaults, args.example
      );
    }

    // Generate context
    // Notice: the values are temporarily represented as arrays, to ease with \
    //   data normalization steps.
    let _context = {
      config : (args.config  || _defaults.config).split(","),
      assets : [(args.assets || _defaults.assets)],
      data   : [(args.data   || _defaults.data)],
      dist   : [(args.dist   || _defaults.dist)],
      temp   : [(args.temp   || _defaults.temp)],
      env    : [(args.env    || _defaults.env)]
    };

    // Append serve-related context?
    if (task === "serve") {
      _context.host = [(args.host || _defaults.host)];
      _context.port = [parseInt((args.port || _defaults.port), 10)];
    }

    // Expand context paths
    let _base_path = process.cwd();

    this.__path_expand_keys.forEach((key) => {
      let _context_values = _context[key];

      for (let _i = 0; _i < _context_values.length; _i++) {
        // Path is not already in absolute format? (convert to absolute)
        if (path.isAbsolute(_context_values[_i]) !== true) {
          _context_values[_i] = (
            path.join(_base_path, _context_values[_i])
          );
        }
      }
    });

    // Re-join context values as bare strings (from lists)
    for (let _key in _context) {
      // Notice, this retains non-string types untouched
      if (_context[_key].length === 1) {
        _context[_key] = _context[_key][0];
      } else {
        _context[_key] = _context[_key].join(",");
      }
    }

    // Validate final context
    if (this.__env_available.includes(_context.env) !== true) {
      throw new Error(
        "Environment value not recognized: " + _context.env
      );
    }

    return _context;
  }


  /**
   * Inject target into defaults
   * @private
   * @param  {object} defaults
   * @param  {string} target
   * @return {object} Defaults w/ injections
   */
  __inject_defaults_target(defaults, target) {
    // Important: create a new defaults object, as not to alter the given one, \
    //   which could be re-used later.
    let _injected_defaults = {};

    for (let _key in defaults) {
      let _cur_default = defaults[_key];

      if (typeof _cur_default === "string") {
        _cur_default = _cur_default.replace("{{target}}", target);
      }

      _injected_defaults[_key] = _cur_default;
    }

    return _injected_defaults;
  }


  /**
   * Setups error traps
   * @private
   * @param  {object} gulp
   * @param  {object} spinner
   * @param  {string} task
   * @return {undefined}
   */
  __setup_error_traps(gulp, spinner, task) {
    // Check if should crash on error
    let _crash_on_error = (
      (this.__actions_no_aborts.includes(task) === true) ? false : true
    );

    // Setup process events
    process.once("exit", (code) => {
      if (code > 0) {
        // Self-kill, because apparently event if calling process.exit(1), the \
        //   process stays active and sticky in certain cases (due to \
        //   registered listeners and file descriptors in some Gulp libraries).
        // Warning: this is a bit hacky!
        process.exitCode = code;

        process.kill(process.pid, "SIGKILL");
      }
    });

    process.on("uncaughtException", (error) => {
      // Throw error and stop spinner
      spinner.fail("Unexpected failure:");

      console.log(
        (error && error.context) ? error.context : error
      );

      spinner.stop();

      process.exit(1);
    });

    // Important: setup Gulp error listener, otherwise any error will get \
    //   uncaught and be handled by 'uncaughtException' at the process-level.
    gulp.on("error", (event) => {
      // Freeze spinner w/ failure
      spinner.fail(
        "Error in '" + event.name + "':"
      );

      if (event.error) {
        console.log(event.error);
      }

      // Restart the spinner
      spinner.start();

      if (_crash_on_error === true) {
        process.exit(1);
      }
    });
  }


  /**
   * Setups Gulp logging
   * @private
   * @param  {object} gulp
   * @param  {object} spinner
   * @return {undefined}
   */
  __setup_gulp_logging(gulp, spinner) {
    // Not quiet and not already setup?
    if (!args.quiet && this.__has_setup_gulp_logging !== true) {
      this.__has_setup_gulp_logging = true;

      gulp.on("start", (event) => {
        // Freeze spinner w/ information
        // Notice: do not log meta-events eg. '<series>'
        if (event.name.startsWith("<") !== true) {
          spinner.info(
            "Starting '" + event.name + "'..."
          );
        }
      });

      gulp.on("stop", (event) => {
        // Freeze spinner w/ success
        // Notice: do not log meta-events eg. '<series>'
        if (event.name.startsWith("<") !== true) {
          spinner.succeed(
            "Finished '" + event.name + "'"
          );

          // Restart the spinner
          spinner.start();
        }
      });
    }
  }


  // jscs:enable disallowIdentifierNames
}


(new ChappeCLI()).run();

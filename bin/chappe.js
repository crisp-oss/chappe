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
        env    : "production"
      },

      example : {
        config : "./examples/{{target}}/config.json",
        assets : "./examples/{{target}}/assets",
        data   : "./examples/{{target}}/data",
        dist   : "./dist",
        temp   : "./.chappe",
        env    : "development"
      }
    };

    this.__actions_available = [
      "clean",
      "build",
      "lint",
      "watch"
    ];

    this.__actions_logging   = [
      "watch"
    ];

    this.__actions_no_aborts = [
      "watch"
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
        this.__format_help_argument("env")
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
    let _has_output = (args.quiet ? false : true);

    // Acquire task from action
    let _task = this.__acquire_action();

    // Dump banner?
    if (_has_output === true) {
      console.log(this.__dump_banner());
    }

    // Acquire context
    global.CONTEXT = this.__acquire_context();

    if (_has_output === true) {
      console.log(
        ("Chappe will " + _task + " docs with context:\n")  +
          (this.__dump_context(global.CONTEXT) + "\n")
      );
    }

    // Setup spinner
    let spinner = ora({
      text  : "Working...\n",
      color : "cyan"
    });

    // Setup error traps
    this.__setup_error_traps(spinner);

    // Setup Gulp logging? (only for certain actions)
    if (this.__actions_logging.includes(_task) === true) {
      this.__setup_gulp_logging(
        require("gulp"), spinner,

        (this.__actions_no_aborts.includes(_task) !== true)  //-[crash_on_error]
      );
    }

    // Import the Gulpfile
    let _gulpfile = require("../gulpfile.js");

    // Start spinner
    spinner.start();

    // Build docs
    _gulpfile[_task]((error) => {
      // Any error occured?
      if (error) {
        // Throw error and stop spinner
        spinner.fail("Error:");

        console.log(error);

        spinner.stop();

        process.exit(1);
      } else {
        let _success_rules = (
          this.__spinner_successes[_task] || this.__spinner_successes.default
        );

        spinner[_success_rules.method](_success_rules.text);
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
    return (
      " --" + name + "  "  +
        "(defaults to: '" + this.__context_defaults.default[name] + "')"
    );
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
   * @return {object} Current context
   */
  __acquire_context() {
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
      _context[_key] = _context[_key].join(",");
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
      _injected_defaults[_key] = defaults[_key].replace("{{target}}", target);
    }

    return _injected_defaults;
  }


  /**
   * Setups error traps
   * @private
   * @param  {object} spinner
   * @return {undefined}
   */
  __setup_error_traps(spinner) {
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
      spinner.fail("Failed:");

      console.log(
        (error && error.context) ? error.context : error
      );

      spinner.stop();

      process.exit(1);
    });
  }


  /**
   * Setups Gulp logging
   * @private
   * @param  {object}  instance
   * @param  {object}  spinner
   * @param  {boolean} [crash_on_error]
   * @return {undefined}
   */
  __setup_gulp_logging(instance, spinner, crash_on_error=true) {
    instance.on("start", (event) => {
      // Freeze spinner w/ information
      spinner.info(
        "Starting '" + event.name + "'..."
      );
    });

    instance.on("stop", (event) => {
      // Freeze spinner w/ success
      spinner.succeed(
        "Finished '" + event.name + "'"
      );

      // Restart the spinner
      spinner.start();
    });

    instance.on("error", (event) => {
      // Freeze spinner w/ failure
      spinner.fail(
        "Error in '" + event.name + "':"
      );

      if (event.error) {
        console.log(event.error);
      }

      // Restart the spinner
      spinner.start();

      if (crash_on_error === true) {
        process.exit(1);
      }
    });
  }


  // jscs:enable disallowIdentifierNames
}


(new ChappeCLI()).run();

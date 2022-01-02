/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var fs                   = require("fs");
var path                 = require("path");

var lodash               = require("lodash");
var del                  = require("del");
var args                 = require("yargs").argv;
var glob                 = require("glob");
var merge                = require("merge-stream");
var compass_importer     = require("compass-importer");
var marked               = require("marked");
var remove_markdown      = require("@tommoor/remove-markdown");
var MiniSearch           = require("minisearch");
var Feed                 = require("feed").Feed;

var gulp                 = require("gulp");

var gulp_file            = require("gulp-file");
var gulp_bower           = require("gulp-bower");
var gulp_jade            = require("gulp-jade");
var gulp_sass            = require("gulp-sass")(require("node-sass"));
var gulp_inline_image    = require("gulp-inline-image");
var gulp_sass_variables  = require("gulp-sass-variables");
var gulp_concat          = require("gulp-concat");
var gulp_babel           = require("gulp-babel");
var gulp_cssmin          = require("gulp-cssmin");
var gulp_uglify          = require("gulp-uglify");
var gulp_rename          = require("gulp-rename");
var gulp_replace         = require("gulp-replace");
var gulp_header          = require("gulp-header");
var gulp_pug_lint        = require("gulp-pug-lint");
var gulp_sass_lint       = require("gulp-sass-lint");
var gulp_sizereport      = require("gulp-sizereport");
var gulp_sitemap         = require("gulp-sitemap");
var gulp_notify          = require("gulp-notify");

var package              = require("./package.json");

var gulp_jade_templates  = require("./res/plugins/gulp/jade-templates");
var gulp_minisearch      = require("./res/plugins/gulp/minisearch");

var marked_renderers     = {
  heading : require("./res/plugins/marked/renderers/heading")
};

var marked_extensions    = {
  navigation      : require("./res/plugins/marked/extensions/navigation"),
  navigation_item : require("./res/plugins/marked/extensions/navigation-item"),
  emphasis        : require("./res/plugins/marked/extensions/emphasis"),
  figcaption      : require("./res/plugins/marked/extensions/figcaption"),
  embed           : require("./res/plugins/marked/extensions/embed")
};


// Global context

var CONTEXT = {
  // Data
  CONFIG        : {},
  SEARCH_INDEX  : null,

  // Configurations
  PATH_CONFIG   : (args.config || null),
  PATH_ASSETS   : (args.assets || null),
  PATH_DATA     : (args.data   || null),
  IS_PRODUCTION : (args.production !== undefined),
  IS_WATCH      : false
};


// Initializers

marked.use({
  renderer   : {
    heading : marked_renderers.heading
  },

  extensions : [
    marked_extensions.navigation,
    marked_extensions.navigation_item,
    marked_extensions.emphasis,
    marked_extensions.figcaption,
    marked_extensions.embed
  ]
});


// Tasks

/*
  Acquires the configuration
*/
gulp.task("get_configuration", function(next) {
  // Assert that the config and data paths are set
  if (CONTEXT.PATH_CONFIG === null || CONTEXT.PATH_ASSETS === null  ||
        CONTEXT.PATH_DATA === null) {
    throw new Error(
      "Configuration or data path not set, please pass them as arguments: "  +
        "--config --assets --data"
    );
  }

  // Make sure that the config and data paths exist
  if (fs.existsSync(CONTEXT.PATH_CONFIG) !== true) {
    throw new Error("The configuration path provided does not exist!");
  }
  if (fs.existsSync(CONTEXT.PATH_ASSETS) !== true) {
    throw new Error("The assets path provided does not exist!");
  }
  if (fs.existsSync(CONTEXT.PATH_DATA) !== true) {
    throw new Error("The data path provided does not exist!");
  }

  // Read configurations (merge them together)
  var _merge_pipeline = [
    // #1: Common configuration (project static)
    require("./res/config/common.json"),

    // #2: Site configuration (project defaults)
    {
      SITE : require("./res/config/user.json")
    },

    // #3: Site configuration (user-provided)
    {
      SITE : require(CONTEXT.PATH_CONFIG)
    }
  ];

  // Unwind merge pipeline
  _merge_pipeline.forEach(function(merge_object) {
    CONTEXT.CONFIG = lodash.merge(CONTEXT.CONFIG, merge_object);
  });

  // Assign contextual values
  CONTEXT.CONFIG.ENVIRONMENT = (
    (CONTEXT.IS_PRODUCTION === true) ? "production" : "development"
  );

  CONTEXT.CONFIG.REVISION = (
    "v" + (package.version || "0.0.0")
  );

  next();
});


/*
  Installs bower packages
*/
gulp.task("bower", function() {
  return gulp_bower()
    .pipe(
      gulp.dest(CONTEXT.CONFIG.ENV.LIBRARIES)
    );
});


/*
  Copies all user assets
*/
gulp.task("copy_user_assets", function() {
  return gulp.src(
    CONTEXT.PATH_ASSETS + "/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/user"
      )
    );
});


/*
  Copies all images (shell task to aggregate sub-tasks)
*/
gulp.task("copy_images_all", [
  "copy_images_base",
  "copy_images_guides"
]);


/*
  Copies images (base images)
*/
gulp.task("copy_images_base", function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.SOURCES + "/images/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/images"
      )
    );
});


/*
  Copies images (guides images)
*/
gulp.task("copy_images_guides", function() {
  return gulp.src(
    CONTEXT.PATH_DATA + "/guides/**/*.{jpg,jpeg,png,gif}"
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/images/guides/content"
      )
    );
});


/*
  Copies fonts
*/
gulp.task("copy_fonts", function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.SOURCES + "/fonts/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/fonts"
      )
    );
});


/*
  Concats javascript libraries
*/
gulp.task("concat_libraries_javascripts", ["bower"], function() {
  // Acquire targets
  // Notice: append user-defined syntaxes for code coloring (from 'prism.js')
  var _targets = CONTEXT.CONFIG.LIBRARIES.JAVASCRIPTS.map(function(library) {
    return (CONTEXT.CONFIG.ENV.LIBRARIES + "/" + library);
  });

  CONTEXT.CONFIG.SITE.plugins.code.syntaxes.forEach(function(syntax) {
    var _syntax_path = (
      CONTEXT.CONFIG.ENV.LIBRARIES + "/prism.js/components/"  +
        "prism-" + syntax + ".js"
    );

    if (fs.existsSync(_syntax_path) !== true) {
      throw new Error(
        "Unsupported code syntax plugin provided: " + syntax
      );
    }

    _targets.push(_syntax_path);
  });

  return gulp.src(_targets)
    .pipe(
      gulp_concat("common/libs.js")
    )
    .pipe(
      gulp_replace(
        "manual: _self.Prism && _self.Prism.manual,", "manual: true,"
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts"
      )
    );
});


/*
  Concats stylesheet libraries
*/
gulp.task("concat_libraries_stylesheets", ["bower"], function() {
  return gulp.src(
    CONTEXT.CONFIG.LIBRARIES.STYLESHEETS.map(function(library) {
      return (CONTEXT.CONFIG.ENV.LIBRARIES + "/" + library);
    })
  )
    .pipe(
      gulp_concat("common/libs.css")
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets"
      )
    );
});


/*
  Compiles all Jade templates (shell task to aggregate sub-tasks)
*/
gulp.task("jade_templates_all", [
  "jade_templates_base",
  "jade_templates_guides",
  "jade_templates_references",
  "jade_templates_changes"
]);


/*
  Prepares Minisearch search index (before it gets populated)
*/
gulp.task("minisearch_prepare", ["get_configuration"], function(next) {
  // Initialize search index
  CONTEXT.SEARCH_INDEX = new MiniSearch(
    CONTEXT.CONFIG.SEARCH.OPTIONS.BASE
  );

  next();
});


/*
  Consolidates Minisearch search index (after it was populated)
*/
gulp.task("minisearch_consolidate", [
  "jade_templates_guides", "jade_templates_references"
], function() {
  // Generate search index data
  return gulp_file(
    ("./" + CONTEXT.CONFIG.SEARCH.INDEX),
    JSON.stringify(CONTEXT.SEARCH_INDEX),

    {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/data"
      )
    );
});


/*
  Compiles Jade templates (base templates)
*/
gulp.task("jade_templates_base", function() {
  var _stream = merge();

  gulp_jade_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(jade_data) {
      _stream.add(
        gulp_jade_templates.pipe_commons(CONTEXT, jade_data.locale, function() {
          return gulp.src(
            CONTEXT.CONFIG.SOURCES.TEMPLATES.map(function(template) {
              return (CONTEXT.CONFIG.ENV.SOURCES + "/templates/" + template);
            }),

            {
              base : (CONTEXT.CONFIG.ENV.SOURCES + "/templates")
            }
          )
            .pipe(
              gulp_jade(jade_data.config)
            );
        })
          .pipe(
            gulp.dest(
              CONTEXT.CONFIG.ENV.BUILD.PAGES
            )
          )
      );
    });

  return _stream;
});


/*
  Compiles Jade templates (guides templates)
*/
gulp.task("jade_templates_guides", function() {
  var _stream = merge();

  // Acquire the guides meta-data
  // Format: { \
  //   segments<array>, id<string>, title<string>, index<int>, links<array>, \
  //   updated<date>, markdown<string>, parent<object>, subtrees<array> \
  // }
  // Output: [tree<array>, linear<array>]
  var _guide_meta_data = (
    gulp_jade_templates.traverse_guides_tree(CONTEXT.PATH_DATA + "/guides")
  );

  var _guide_meta_tree   = _guide_meta_data[0],
      _guide_meta_linear = _guide_meta_data[1];

  // Append all guides to search index
  var _categories = _guide_meta_tree[0];

  if (_categories) {
    gulp_minisearch.insert_categories(
      CONTEXT, "guides", [_categories.title], (_categories.subtrees || [])
    );
  }

  // Compile all guide pages
  gulp_jade_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(jade_data) {
      _guide_meta_linear.forEach(function(guide_level) {
        // Generate current guide data (for locale)
        var jade_level_config = lodash.cloneDeep(jade_data.config);

        jade_level_config.data.guides = _guide_meta_tree;
        jade_level_config.data.guide  = guide_level;

        // Forbid indexing? (if any entry segment starts with an underscore)
        var _segment_private_index = guide_level.segments.findIndex(
          function(segment) {
            return ((segment[0] === "_") ? true : false);
          }
        );

        if (_segment_private_index !== -1) {
          jade_level_config.data.INDEXING = false;
        }

        _stream.add(
          gulp_jade_templates.pipe_commons(
            CONTEXT, jade_data.locale, function() {
              return gulp.src(
                (CONTEXT.CONFIG.ENV.SOURCES + "/templates/guides/index.jade"),

                {
                  base : (CONTEXT.CONFIG.ENV.SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_jade(jade_level_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = path.join.apply(this, [].concat(
                      guide_level.segments, ["index"]
                    ));
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.CONFIG.ENV.BUILD.PAGES
              )
            )
        );
      });
    });

  return _stream;
});


/*
  Compiles Jade templates (references templates)
*/
gulp.task("jade_templates_references", function() {
  var _stream = merge();

  // Acquire the parsed references content
  // Format: {segments<array>, type<string>, data<object>}
  // Output: linear<array>
  var _reference_meta_data = (
    gulp_jade_templates.traverse_references_linear(
      CONTEXT, (CONTEXT.PATH_DATA + "/references")
    )
  );

  gulp_jade_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(jade_data) {
      _reference_meta_data.forEach(function(reference_entry) {
        // Generate current reference data (for locale)
        var jade_entry_config = lodash.cloneDeep(jade_data.config);

        jade_entry_config.data.reference = reference_entry;

        // Forbid indexing? (if any entry segment starts with an underscore)
        var _segment_private_index = reference_entry.segments.findIndex(
          function(segment) {
            return ((segment[0] === "_") ? true : false);
          }
        );

        if (_segment_private_index !== -1) {
          jade_entry_config.data.INDEXING = false;
        }

        // Append all reference anchors to search index
        // Important: only if reference indexing is not forbidden
        if (reference_entry.categories  &&
              jade_entry_config.data.INDEXING !== false) {
          // Acquire reference path, as well as reference path title (with \
          //   its common suffix extracted)
          // Notice: 'REST API Reference (V1)' becomes 'REST API' + 'V1'
          var _reference_path    = ["References"],
              _title_split_regex = /^(.+) Reference \(([^\(\)]+)\)$/;

          var _title_matcher = (
            reference_entry.title.match(_title_split_regex)
          );

          var _reference_title_path = (
            (_title_matcher && _title_matcher[1] && _title_matcher[2]) ?
              [_title_matcher[1], _title_matcher[2]] : [reference_entry.title]
          );

          // Insert reference base
          gulp_minisearch.insert_categories(
            CONTEXT, "references", _reference_path, [reference_entry]
          );

          // Insert reference sub-categories
          gulp_minisearch.insert_categories(
            CONTEXT, "references",
              [].concat(_reference_path, _reference_title_path),
              reference_entry.categories, reference_entry.segments
          );
        }

        _stream.add(
          gulp_jade_templates.pipe_commons(
            CONTEXT, jade_data.locale, function() {
              return gulp.src(
                (
                  CONTEXT.CONFIG.ENV.SOURCES  +
                    "/templates/references/index.jade"
                ),

                {
                  base : (CONTEXT.CONFIG.ENV.SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_jade(jade_entry_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = path.join.apply(this, [].concat(
                      reference_entry.segments, ["index"]
                    ));
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.CONFIG.ENV.BUILD.PAGES
              )
            )
        );
      });
    });

  return _stream;
});


/*
  Compiles Jade templates (changes templates)
*/
gulp.task("jade_templates_changes", function() {
  var _stream = merge();

  // Acquire the change years data
  // Format: [year<int>, data<object>] (ordered by most recent year first)
  var _change_years = (
    glob.sync(
      (CONTEXT.PATH_DATA + "/changes/*.json")
    )
      .sort()
      .reverse()
      .map(function(file_path) {
        var _file_path_parts = path.parse(file_path);

        return [
          parseInt(_file_path_parts.name, 10),
          JSON.parse(fs.readFileSync(file_path))
        ];
      })
      .map(function(year_data) {
        // Classify each change in its month (in an orderly manner)
        // Notice: the Map object is used as it retains natural ordering, \
        //   where last months come first.
        var _year_months = new Map();

        year_data[1].forEach(function(entry) {
          // Validate entry data
          if (!entry.group || !entry.type || !entry.date || !entry.text) {
            throw new Error(
              "Invalid entry data in changes for year: " + year_data[0]
            );
          }

          // Acquire entry date
          var _entry_date = (new Date(entry.date));

          if (!_entry_date || isNaN(_entry_date.getTime())) {
            throw new Error(
              "Invalid date in changes for year: " + year_data[0]
            );
          }

          // Acquire entry month key
          var _entry_month_key = ("" + (_entry_date.getMonth() + 1));

          if (_entry_month_key.length === 1) {
            _entry_month_key = ("0" + _entry_month_key);
          }

          // Make sure entries object for month is initialized
          if (_year_months.has(_entry_month_key) === false) {
            _year_months.set(_entry_month_key, []);
          }

          // Append entry to month entries object
          _year_months.get(_entry_month_key).push(entry);
        });

        // Assign new per-month data
        // Important: convert back all ordered map entries to an array, which \
        //   we can iterate on right away from templates.
        year_data[1] = Array.from(
          _year_months.entries()
        );

        return year_data;
      })
  );

  // Map available change years (as bare numbers)
  // Important: before prepending latest year data
  var _available_bare_years = _change_years.map(function(change_year) {
    return change_year[0];
  });

  // Prepend list of years with the 'latest' year (ie. corresponding to the \
  //   'index'), and push only the first 3 months (ie. latest)
  var _first_change_year = (_change_years[0] || []);

  _change_years.unshift([
    (_first_change_year[0] || -1),
    (_first_change_year[1] || []).slice(0, 3),
    "index"
  ]);

  gulp_jade_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(jade_data) {
      _change_years.forEach(function(change_year) {
        // Generate current year data (for locale)
        var jade_year_config = lodash.cloneDeep(jade_data.config);

        jade_year_config.data.years   = _available_bare_years;

        jade_year_config.data.changes = {
          year     : change_year[0],

          current  : (
            (change_year[2] === "index") ? "latest" : change_year[0]
          ),

          timeline : change_year[1]
        };

        _stream.add(
          gulp_jade_templates.pipe_commons(
            CONTEXT, jade_data.locale, function() {
              return gulp.src(
                (CONTEXT.CONFIG.ENV.SOURCES + "/templates/changes/index.jade"),

                {
                  base : (CONTEXT.CONFIG.ENV.SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_jade(jade_year_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = (
                      change_year[2] ? change_year[2] : (
                        path.join(("" + change_year[0]), "index")
                      )
                    );
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.CONFIG.ENV.BUILD.PAGES
              )
            )
        );
      });
    });

  return _stream;
});


/*
  Compiles SASS stylesheets
*/
gulp.task("sass", function() {
  return gulp.src(
    CONTEXT.CONFIG.SOURCES.STYLESHEETS.map(function(stylesheet) {
      return (CONTEXT.CONFIG.ENV.SOURCES + "/stylesheets/" + stylesheet);
    }),

    {
      base : (CONTEXT.CONFIG.ENV.SOURCES + "/stylesheets")
    }
  )
    .pipe(
      gulp_sass_variables({
        "$with-inline-images" : CONTEXT.IS_PRODUCTION,
        "$cache-buster-hash"  : CONTEXT.CONFIG.REVISION
      })
    )
    .pipe(
      gulp_sass({
        outputStyle : "expanded",
        importer    : compass_importer
      })
    )
    .on("error", gulp_notify.onError({
      title     : "sass",
      message   : "Error compiling",
      emitError : true
    }))
    .on("error", function(error) {
      if (CONTEXT.IS_WATCH === true) {
        // Handle compile errors (used for development ease w/ `gulp watch`)
        console.error(error.toString());  // jscs:ignore
      } else {
        throw error;
      }
    })
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets"
      )
    );
});


/*
  Imports inline images in stylesheets
*/
gulp.task("css_inline_images", ["sass"], function() {
  return gulp.src((
    CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets/**/*.css"
  ), {
    base : (CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/images")
  })
    .pipe(
      gulp_inline_image()
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets"
      )
    );
});


/*
  Compiles Babel templates
*/
gulp.task("babel", function() {
  return gulp.src(
    CONTEXT.CONFIG.SOURCES.JAVASCRIPTS.map(function(javascript) {
      return (CONTEXT.CONFIG.ENV.SOURCES + "/javascripts/" + javascript);
    }),

    {
      base : (CONTEXT.CONFIG.ENV.SOURCES + "/javascripts")
    }
  )
    .pipe(
      gulp_babel()
    )
    .on("error", gulp_notify.onError({
      title     : "babel",
      message   : "Error compiling",
      emitError : true
    }))
    .on("error", function(error) {
      if (CONTEXT.IS_WATCH === true) {
        // Handle compile errors (used for development ease w/ `gulp watch`)
        console.error(error.toString());  // jscs:ignore
      } else {
        throw error;
      }
    })
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts"
      )
    );
});


/*
  Replaces values from all template files (shell task to aggregate sub-tasks)
*/
gulp.task("replace_templates_all", [
  "jade_templates_all",
  "replace_templates_guides"
]);


/*
  Replaces values from template files (guides templates)
*/
gulp.task("replace_templates_guides", ["jade_templates_guides"], function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.BUILD.PAGES + "/guides/**/*.html"
  )
    .pipe(
      gulp_replace(
        /src="(?:\.\/)?([^\.\/"']+\.(?:jpg|jpeg|png|gif))"/g,

        function(_, file_name) {
          // Acquire base path segments
          var _image_base_segments = this.file.relative.split("/");

          _image_base_segments.pop();

          // Build final path segments
          var _image_final_segments = (
            [].concat(
              ["", "static", "images", "guides", "content"],
              _image_base_segments,
              [file_name]
            )
          );

          // Replace with final path to image file within static assets
          return (
            "src=\"" + _image_final_segments.join("/") + "\""
          );
        }
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.PAGES + "/guides"
      )
    );
});


/*
  Replaces values from javascript files
*/
gulp.task("replace_javascripts", [
  "babel", "concat_libraries_javascripts"
], function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts/**/*.js"
  )
    .pipe(
      gulp_replace(
        "@:revision", CONTEXT.CONFIG.REVISION
      )
    )
    .pipe(
      gulp_replace(
        "@:url_status", (CONTEXT.CONFIG.SITE.urls.vigil || "")
      )
    )
    .pipe(
      gulp_replace(
        "@:search_index", CONTEXT.CONFIG.SEARCH.INDEX
      )
    )
    .pipe(
      gulp_replace(
        "\"@:search_options_base\"",
        JSON.stringify(CONTEXT.CONFIG.SEARCH.OPTIONS.BASE)
      )
    )
    .pipe(
      gulp_replace(
        "\"@:search_options_query\"",
        JSON.stringify(CONTEXT.CONFIG.SEARCH.OPTIONS.QUERY)
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts"
      )
    );
});


/*
  Compiles all feeds (shell task to aggregate sub-tasks)
*/
gulp.task("feed_all", [
  "feed_changes"
]);


/*
  Compiles feeds (changes templates)
*/
gulp.task("feed_changes", function() {
  var _title_maximum_length = 80;

  // Acquire paths for the last 3 years (sort by last year first)
  var _feed_years_back = 3;

  var _last_year_paths = glob.sync(
    (CONTEXT.PATH_DATA + "/changes/*.json")
  )
    .sort()
    .reverse()
    .splice(0, _feed_years_back);

  // Acquire the change years data
  var _change_years = (
    _last_year_paths.map(function(file_path) {
      return JSON.parse(
        fs.readFileSync(file_path)
      );
    })
  );

  // Concatenate all changes together
  var _changes_flat = [].concat.apply(
    [], _change_years
  );

  // Construct feed object
  var _feed = new Feed({
    title       : "Platform Changes",
    description : "Feed of all Platform changes.",

    link        : CONTEXT.CONFIG.SITE.urls.base,
    language    : "en",
    generator   : package.name,

    author      : {
      name : package.author.name
    },

    favicon     : (
      CONTEXT.CONFIG.SITE.urls.base + "/favicon.ico"
    ),

    updated     : (new Date())
  });

  _changes_flat.forEach(function(change) {
    // Strip Markdown from text
    var _text_barebone = (
      remove_markdown(change.text || "")
    );

    // Split text into a title
    var _title;

    if (_text_barebone.length > _title_maximum_length) {
      _title = (
        _text_barebone.substr(0, _title_maximum_length) + " (..)"
      );
    } else {
      _title = _text_barebone;
    }

    // Add entry
    _feed.addItem({
      title   : _title,
      content : marked(change.text),
      link    : (CONTEXT.CONFIG.SITE.urls.base + "/changes/"),
      date    : (new Date(change.date))
    });
  });

  // Generate feed data
  return gulp_file(
    "changes.rss", _feed.rss2(), {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.PAGES
      )
    );
});


/*
  Generates sitemap
*/
gulp.task("sitemap", ["jade_templates_all"], function() {
  // Scan all templates, while ignoring the 'not_found' page and all private \
  //   pages (ie. those starting w/ '_')
  return gulp.src([
    (
      "!" + CONTEXT.CONFIG.ENV.BUILD.PAGES + "/not_found/index.html"
    ),

    (
      "!" + CONTEXT.CONFIG.ENV.BUILD.PAGES + "/**/_*/index.html"
    ),

    (
      CONTEXT.CONFIG.ENV.BUILD.PAGES + "/**/*.html"
    )
  ])
    .pipe(
      gulp_sitemap({
        siteUrl : CONTEXT.CONFIG.SITE.urls.base,

        getLoc  : function(site_url, location) {
          // Nuke file name and extension from URL? (if found)
          // Notice: built files are stored in directories, corresponding to \
          //   their path, ending in a file named eg. 'index.html'.
          var _file_index = location.lastIndexOf("index.html");

          // Rewrite location?
          if (_file_index > 0) {
            location = location.substring(0, _file_index);
          }

          return location;
        }
      })
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.PAGES
      )
    );
});


/*
  Generates robots
*/
gulp.task("robots", function() {
  return gulp_file(
    "robots.txt",

    (
      "User-Agent: *\n"  +
      "Allow: /\n"       +
      ("Sitemap: " + CONTEXT.CONFIG.SITE.urls.base + "/sitemap.xml\n")
    ),

    {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.PAGES
      )
    );
});


/*
  Minifies stylesheet files
*/
gulp.task("cssmin", [
  "css_inline_images", "concat_libraries_stylesheets"
],
  function() {
    return gulp.src(
      CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets/**/*.css"
    )
      .pipe(
        gulp_cssmin()
      )
      .pipe(
        gulp.dest(
          CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/stylesheets"
        )
      );
  }
);


/*
  Minifies javascript files
*/
gulp.task("uglify", ["replace_javascripts"], function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts/**/*.js"
  )
    .pipe(
      gulp_uglify()
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/javascripts"
      )
    );
});


/*
  Insert banner in build files
*/
gulp.task("build_banner", [
  "uglify", "cssmin", "replace_templates_all"
], function() {
  var date   = new Date();

  var today  = (
    (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
  );

  var banner = [
    "/**",
    " * <%= pkg.name %> - <%= pkg.description %>",
    " * @version v<%= pkg.version %>",
    " * @author <%= pkg.author.name %> <%= pkg.author.url %>",
    " * @date <%= today %>",
    " */",
    ""
  ].join("\n");

  return gulp.src(
    CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/**/*.{css,js}"
  )
    .pipe(
      gulp_header(banner, {
        pkg   : package,
        today : today
      })
    )
    .pipe(
      gulp.dest(
        CONTEXT.CONFIG.ENV.BUILD.ASSETS
      )
    );
});


/*
  Shows final build size
*/
gulp.task("build_size", ["minisearch_consolidate"], function() {
  var _stream = merge();

  // Map all sources and options
  var _sources = [
    {
      glob    : (
        CONTEXT.CONFIG.ENV.BUILD.PAGES + "/references/**/*.html"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : true,

          "*"   : {
            // 80KB maximum
            maxGzippedSize : 80000
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.CONFIG.ENV.BUILD.PAGES + "/guides/**/*.html"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : true,

          "*"   : {
            // 25KB maximum
            maxGzippedSize : 25000
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/images/guides/content/**/"  +
          "*.{jpg,jpeg,png,gif}"
      ),

      options : {
        production : {
          total : true,
          fail  : true,

          "*"   : {
            // 500KB maximum
            maxSize : 500000
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/data/**/*.json"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : true,

          "*"   : {
            // 140KB maximum
            maxSize : 140000,

            // 25KB maximum
            maxGzippedSize : 25000
          }
        }
      }
    }
  ];

  // Compute size report for each source
  _sources.forEach(function(source) {
    _stream.add(
      gulp.src(source.glob)
        .pipe(
          gulp_sizereport(
            CONTEXT.IS_PRODUCTION ? source.options.production : (
              source.options.production.default || {
                total : true
              }
            )
          )
        )
    );
  });

  return _stream;
});


/*
  Lints Jade templates
*/
gulp.task("lint_jade_templates", function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.SOURCES + "/templates/**/*.jade"
  )
    .pipe(
      gulp_pug_lint()
    );
});


/*
  Lints SASS stylesheets
*/
gulp.task("lint_sass_stylesheets", function() {
  return gulp.src(
    CONTEXT.CONFIG.ENV.SOURCES + "/stylesheets/**/*.sass"
  )
    .pipe(
      gulp_sass_lint()
    )
    .pipe(
      gulp_sass_lint.format()
    );
});


/*
  Cleans all build files
*/
gulp.task("clean:reset", ["get_configuration"], function() {
  return del([
    (CONTEXT.CONFIG.ENV.BUILD.ASSETS + "/*"),
    (CONTEXT.CONFIG.ENV.BUILD.PAGES + "/*"),
    (CONTEXT.CONFIG.ENV.LIBRARIES + "/*"),
    "bower_components/"
  ]);
});


/*
  Lints project built code
*/
gulp.task("lint", ["get_configuration"], function() {
  gulp.start(
    "lint_jade_templates",
    "lint_sass_stylesheets"
  );
});


/*
  Builds project
*/
gulp.task("build", [
  "get_configuration", "minisearch_prepare"
], function() {
  gulp.start(
    "bower"
  );

  gulp.start(
    "concat_libraries_stylesheets",
    "concat_libraries_javascripts"
  );

  gulp.start(
    "copy_user_assets",
    "copy_images_all",
    "copy_fonts"
  );

  gulp.start(
    "replace_templates_all",
    "css_inline_images",
    "replace_javascripts"
  );

  gulp.start(
    "sitemap",
    "robots",
    "feed_all",
    "minisearch_consolidate"
  );

  if (CONTEXT.IS_PRODUCTION) {
    gulp.start(
      "cssmin",
      "uglify"
    );

    gulp.start(
      "build_banner",
      "build_size"
    );
  }
});


/*
  Watches for project changes
*/
gulp.task("watch", [
  "get_configuration", "minisearch_prepare"
], function() {
  CONTEXT.IS_WATCH = true;

  gulp.watch("config/*", [
    "get_configuration"
  ]);

  gulp.watch("bower.json", [
    "bower"
  ]);

  gulp.watch("src/images/**/*", [
    "copy_images_base"
  ]);

  gulp.watch("src/fonts/**/*", [
    "copy_fonts"
  ]);

  gulp.watch("src/locales/**/*", [
    "replace_templates_all",
    "sitemap"
  ]);

  gulp.watch("src/templates/**/*", [
    "replace_templates_all",
    "sitemap"
  ]);

  gulp.watch("src/stylesheets/**/*", [
    "css_inline_images"
  ]);

  gulp.watch("src/javascripts/**/*", [
    "replace_javascripts"
  ]);
});


/*
  Entry point (default task)
*/
gulp.task("default", [
  "build"
]);

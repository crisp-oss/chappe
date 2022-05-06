/*
 * chappe
 *
 * Copyright 2021, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


/**
 * Common
 * @class
 * @classdesc Common class.
 */
class Common {
  /**
   * Constructor
   */
  constructor() {
    let fn = "constructor";

    try {
      this.ns = "Common";
      this._$ = $;

      // Selectors
      this._document_sel = this._$(document);

      // Configuration
      this.__revision                    = "@:revision";
      this.__url_status                  = "@:url_status";

      this.__search_index_path           = "@:search_index";
      this.__search_index_options_base   = "@:search_options_base";
      this.__search_index_options_query  = "@:search_options_query";

      this.__second_in_milliseconds      = 1000;   // 1 second

      this.__copy_state_confirm_delay    = 2000;   // 2 seconds

      this.__content_anchor_viewed_delay = 100;    // 1/10 second

      this.__status_poll_interval        = 5000;   // 5 seconds
      this.__status_poll_refresh         = 90000;  // 90 seconds

      this.__chatbox_z_index             = 120;
      this.__search_results_limit        = 12;

      this.__cookie_prefix               = "chappe/";

      this.__status_known_health         = [
        "healthy",
        "sick",
        "dead"
      ];

      // Instances
      this.__escape_html_text_rules = {
        "&amp;"  : /&/g,
        "&lt;"   : /</g,
        "&gt;"   : />/g,
        "&quot;" : /"/g
      };

      // Storage
      this.__crisp_chat_feedback_shown     = false;
      this.__search_opened                 = false;
      this.__appearance_mode               = "light";

      this.__content_anchor_viewed_timeout = null;
      this.__status_poll_scheduler         = null;

      this.__search_index_responder        = null;
      this.__search_index_load_pending     = null;

      this.__search_field_value_last       = "";

      this.__status_poll_health            = null;
      this.__status_poll_last_check        = 0;
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Initializes the class
   * @public
   * @return {undefined}
   */
  init() {
    let fn = "init";

    try {
      this.__chatbox();
      this.__options();
      this.__events();
      this.__schedules();
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Configures the chatbox
   * @private
   * @return {undefined}
   */
  __chatbox() {
    let fn = "__chatbox";

    try {
      // Adjust chatbox z-index? (if chatbox is included)
      if (typeof window.$crisp !== "undefined") {
        window.$crisp.push([
          "config", "container:index", this.__chatbox_z_index
        ]);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Setups all user options
   * @private
   * @return {undefined}
   */
  __options() {
    let fn = "__options";

    try {
      // Restore appearance options
      this.__toggle_appearance(
        this.__detect_appearance_preference()  //-[mode]
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds all events
   * @private
   * @return {undefined}
   */
  __events() {
    let fn = "__events";

    try {
      // Bind common events
      this.__bind_copy_click();

      // Bind search events
      this.__bind_search_open_keydown();
      this.__bind_search_open_click();
      this.__bind_search_close_click();
      this.__bind_search_field_keyup();

      // Bind appearance events
      this.__bind_appearance_toggle_click();

      // Bind sidebar events
      this.__bind_sidebar_toggler_click();
      this.__bind_sidebar_nest_level_toggle_click();

      // Bind content events
      this.__bind_content_anchor_viewed();

      // Bind code events
      this.__bind_code_metas_picker_change();
      this.__bind_code_block_viewed();

      // Bind Markdown events
      this.__bind_markdown_embed_click();

      // Bind chatbox events
      this.__bind_crisp_chat_open_click();
      this.__bind_crisp_chat_feedback_click();
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds all schedules
   * @private
   * @return {undefined}
   */
  __schedules() {
    let fn = "__schedules";

    try {
      // Bind all schedules
      this.__bind_status_poll_schedule();
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Reads cookie
   * @private
   * @param  {string} cookie_key
   * @return {string} Cookie value (if any)
   */
  __read_cookie(cookie_key) {
    let fn = "__read_cookie";

    let _cookie_value;

    try {
      _cookie_value = Cookies.get(
        (this.__cookie_prefix + cookie_key)
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return _cookie_value;
    }
  }


  /**
   * Writes cookie
   * @private
   * @param  {string} cookie_key
   * @param  {string} cookie_value
   * @return {undefined}
   */
  __write_cookie(cookie_key, cookie_value) {
    let fn = "__write_cookie";

    try {
      Cookies.set(
        (this.__cookie_prefix + cookie_key), cookie_value,

        {
          domain   : location.hostname,
          expires  : Infinity,
          sameSite : "strict"
        }
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Copies text (from element)
   * @private
   * @param  {object} text_el
   * @return {undefined}
   */
  __copy_text(text_el) {
    let fn = "__copy_text";

    let _was_copied = false;

    try {
      // Select text (clear out existing selections first)
      let _range = document.createRange();

      _range.selectNode(text_el);

      window.getSelection().removeAllRanges();
      window.getSelection().addRange(_range);

      // Copy text
      document.execCommand("copy");

      window.getSelection().removeAllRanges();

      _was_copied = true;
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return _was_copied;
    }
  }


  /**
   * Escapes text (to be included in HTML)
   * @private
   * @param  {string} text_raw
   * @return {string} Escaped text
   */
  __escape_html_text(text_raw) {
    let fn = "__escape_html_text";

    let _text_safe = "";

    try {
      let _text_buffer = text_raw;

      // Apply all escape rules to text
      for (let _value in this.__escape_html_text_rules) {
        let _rule = this.__escape_html_text_rules[_value];

        _text_buffer = _text_buffer.replace(_rule, _value);
      }

      _text_safe = _text_buffer;
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return _text_safe;
    }
  }


  /**
   * Opens up search
   * @private
   * @return {undefined}
   */
  __open_search() {
    let fn = "__open_search";

    try {
      if (this.__search_opened !== true) {
        this.__search_opened = true;

        // Open search
        let _search_sel = this._$("#search"),
            _input_sel  = _search_sel.find(".spotlight-input");

        _search_sel.css("display", "block");

        // Focus on search input?
        if (_input_sel.length > 0) {
          _input_sel[0].focus();
        }

        // Ensure that search index is loaded? (if not already loaded, or not \
        //   already loading)
        this.__ensure_load_search_index(_search_sel);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Closes search
   * @private
   * @param  {boolean} [do_reset]
   * @return {undefined}
   */
  __close_search(do_reset=false) {
    let fn = "__close_search";

    try {
      if (this.__search_opened === true) {
        this.__search_opened = false;

        // Close search
        let _search_sel = this._$("#search");

        _search_sel.css("display", "none");

        // Reset search value and results?
        if (do_reset === true) {
          let _spotlight_sel = _search_sel.find(".spotlight"),
              _input_sel     = _spotlight_sel.find(".spotlight-input"),
              _entries_sel   = _spotlight_sel.find(".spotlight-entries");

          // Reset input value
          this.__search_field_value_last = "";

          _input_sel.val("");

          // Reset search results
          _entries_sel.empty();

          _spotlight_sel.attr("data-has-results", "false");
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Toggles selected search result
   * @private
   * @param  {object} results_all_sel
   * @param  {number} [increment]
   * @return {undefined}
   */
  __toggle_search_result_selected(results_all_sel, increment=1) {
    let fn = "__toggle_search_result_selected";

    try {
      // Any result?
      if (results_all_sel.length > 0) {
        // Find the index of the active result
        let _index = -1;

        for (let _i = 0; _i < results_all_sel.length; _i++) {
          if (results_all_sel[_i].getAttribute("data-selected") === "true") {
            _index = _i;

            break;
          }
        }

        // Process the index of the next element to activate
        _index += increment;

        if (_index < 0) {
          _index = (results_all_sel.length - 1);
        } else if (_index >= results_all_sel.length) {
          _index = 0;
        }

        // Select target element?
        if (_index > -1) {
          let _result_selected_el = results_all_sel[_index];

          // Set selected state to selected element
          results_all_sel.removeAttr("data-selected");

          this._$(_result_selected_el).attr("data-selected", "true");

          // Scroll to selected element
          _result_selected_el.scrollIntoView({
            behavior : "smooth",
            block    : "nearest"
          });
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Proceeds search query
   * @private
   * @param  {object} spotlight_sel
   * @param  {object} results_sel
   * @param  {object} entries_sel
   * @param  {string} [search_query]
   * @return {undefined}
   */
  __proceed_search_query(
    spotlight_sel, results_sel, entries_sel, search_query=""
  ) {
    let fn = "__proceed_search_query";

    try {
      // Initialize 'has results' state
      let _has_results = false;

      // Acquire search results
      if (search_query) {
        // Responder is not available? Throw an error, as this should \
        //   never happen.
        if (this.__search_index_responder === null) {
          throw new Error(
            "Search index responder is not available (yet?)"
          );
        }

        // Obtain search results from index responder
        let _search_results = (
          this.__search_index_responder.search(search_query)
        );

        if (_search_results.length > 0) {
          _has_results = true;

          // Limit results to N first results
          if (_search_results.length > this.__search_results_limit) {
            _search_results = _search_results.slice(
              0, this.__search_results_limit
            );
          }

          // Inject search results
          this.__inject_search_results(
            results_sel, entries_sel, _search_results
          );
        }
      }

      // Mark as having results (or not)
      spotlight_sel.attr(
        "data-has-results", ((_has_results === true) ? "true" : "false")
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Ensures that search index is loaded
   * @private
   * @param  {object} search_sel
   * @return {undefined}
   */
  __ensure_load_search_index(search_sel) {
    let fn = "__ensure_load_search_index";

    try {
      // Not already loaded, and load not already pending?
      if (this.__search_index_responder === null  &&
            this.__search_index_load_pending === null) {
        // Select spotlight element
        let _spotlight_sel = search_sel.find(".spotlight");

        // Mark as pending (initialize pending operations stack)
        this.__search_index_load_pending = [];

        // Reset any previously-set error state
        _spotlight_sel.removeAttr("data-index-error");

        // Load index data from network
        fetch(
          `/static/data/${this.__search_index_path}?${this.__revision}`,

          {
            mode : "same-origin"
          }
        )
          .then((response) => {
            // Non-success response?
            if (response.status >= 400) {
              return Promise.reject(null);
            }

            // Examine the text in the response
            return response.text();
          })
          .then((index_data) => {
            // Build search index responder (this parses from text JSON)
            this.__search_index_responder = MiniSearch.loadJSON(
              index_data,

              Object.assign(
                {},
                this.__search_index_options_base,
                this.__search_index_options_query
              )
            );

            // Handle all pending operations
            while (this.__search_index_load_pending.length > 0) {
              this.__search_index_load_pending.shift()();
            }

            return Promise.resolve();
          })
          .catch(() => {
            // Show index loading error
            _spotlight_sel.attr("data-index-error", "true");

            // Pass-through (ignore for this session)
            return Promise.resolve();
          })
          .then(() => {
            // Hide load spinner (as all deferred actions have been fired, \
            //   if index was successfully loaded)
            _spotlight_sel.removeAttr("data-index-loading");

            // Mark as not pending anymore
            this.__search_index_load_pending = null;
          });
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Toggles sidebar nest level
   * @private
   * @param  {object}  target_sel
   * @param  {boolean} [is_anchor]
   * @return {undefined}
   */
  __toggle_sidebar_nest_level(target_sel, is_anchor=false) {
    let fn = "__toggle_sidebar_nest_level";

    try {
      let _parent_sel = (
        target_sel.parents(".nest-navigate-level")
      );

      if (_parent_sel) {
        let _new_state = (
          (_parent_sel.attr("data-expanded") === "true") ? "false" : "true"
        );

        // Unexpand all other expanded levels first? (only if new state is \
        //   expanded)
        // Notice #1: we do not want to allow multiple levels to be expanded \
        //   at the same time, as this can consume quite a large amount of \
        //   browser height and clutter the UI.
        // Notice #2: only when click originates from a viewed anchor.
        if (_new_state === "true" && is_anchor === true) {
          let _expanded_all_sel = this._$(
            "#content .sidebar .nest .nest-navigate-level"  +
              "[data-expanded=\"true\"]"
          );

          _expanded_all_sel.attr("data-expanded", "false");
        }

        // Toggle expanded state on selected level
        _parent_sel.attr("data-expanded", _new_state);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Toggles appearance mode
   * @private
   * @param  {string} [new_mode]
   * @return {undefined}
   */
  __toggle_appearance(new_mode=null) {
    let fn = "__toggle_appearance";

    try {
      if (new_mode !== null && this.__appearance_mode !== new_mode) {
        // Store new appearance mode (now current mode)
        this.__appearance_mode = new_mode;

        // Update current appearance mode (in toggle)
        this._$("#header .coloring").attr("data-mode", new_mode);

        // Update dark mode in document
        document.body.setAttribute("data-appearance", new_mode);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Detects appearance preference
   * @private
   * @return {string} Detected appearance preference
   */
  __detect_appearance_preference() {
    let fn = "__detect_appearance_preference";

    let _mode = null;

    try {
      // Attempt to detect mode from cookies? (user override)
      let _mode_cookies = (
        this.__read_cookie("appearance-mode") || null
      );

      if (_mode_cookies !== null) {
        _mode = _mode_cookies;

        // Abort detection there.
        return;
      }

      // Attempt to detect mode from media query? (operating system)
      if (typeof window.matchMedia === "function"  &&
            (window.matchMedia("(prefers-color-scheme: dark)").matches  ===
              true)) {
        _mode = "dark";

        // Abort detection there.
        return;
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return (_mode || "light");
    }
  }


  /**
   * Refreshes code metas picker section
   * @private
   * @param  {string} direction
   * @param  {object} code_box_sel
   * @param  {object} section_sel
   * @param  {string} selected_value
   * @param  {object} code_chunk
   * @return {undefined}
   */
  __refresh_code_metas_picker_section(
    direction, code_box_sel, section_sel, selected_value, code_chunk
  ) {
    let fn = "__refresh_code_metas_picker_section";

    try {
      if (section_sel.length > 0 && selected_value) {
        // Acquire selectors
        let _type_sel    = section_sel.find(".code-meta-type"),
            _content_sel = section_sel.find(".code-content");

        if (_type_sel.length > 0 && _content_sel.length > 0) {
          // Update code type
          _type_sel.text(code_chunk.type);

          // Inject code block?
          if (code_chunk.data) {
            // Generate the list of classes on code element
            let _class_list = [];

            if (code_chunk.type) {
              _class_list.push(`language-${code_chunk.type.toLowerCase()}`);
            }
            if (direction === "request") {
              _class_list.push("copy-value");
            }

            let _code_class_spaced = (
              (_class_list.length === 0) ? "" :
                ` class="${_class_list.join(" ")}"`
            );

            _content_sel.html(
              `<code${_code_class_spaced}></code>`
            );

            // Select newly-injected code block
            let _code_block_sel = _content_sel.find("code");

            if (_code_block_sel.length > 0) {
              // Update code content
              _code_block_sel.text(code_chunk.data);

              // Re-apply code coloring
              _code_block_sel[0].setAttribute("data-viewed", "");

              window.Prism.highlightElement(_code_block_sel[0]);
            }
          } else {
            // Replace w/ empty placeholder
            _content_sel.html("—");
          }

          // Update 'has request' marker? (only if direction is 'request')
          if (direction === "request") {
            code_box_sel.attr(
              "data-has-request", (code_chunk.data ? "true" : "false")
            );
          }
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Schedules the handling of content anchor viewed event
   * @private
   * @param  {object} link_all_sel
   * @param  {object} sidebar_left_sel
   * @param  {string} anchor_id
   * @param  {number} [header_height]
   * @return {undefined}
   */
  __schedule_handle_content_anchor_viewed(
    link_all_sel, sidebar_left_sel, anchor_id, header_height=0
  ) {
    let fn = "__schedule_handle_content_anchor_viewed";

    try {
      // Cancel last scheduled update?
      if (this.__content_anchor_viewed_timeout !== null) {
        clearTimeout(this.__content_anchor_viewed_timeout);
      }

      // Schedule next update (defer)
      this.__content_anchor_viewed_timeout = setTimeout(() => {
        this.__content_anchor_viewed_timeout = null;

        // Trigger content anchor viewed event handler
        this.__handle_content_anchor_viewed(
          link_all_sel, sidebar_left_sel, anchor_id, header_height
        );
      }, this.__content_anchor_viewed_delay);
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Handles content anchor viewed event
   * @private
   * @param  {object} link_all_sel
   * @param  {object} sidebar_left_sel
   * @param  {string} anchor_id
   * @param  {number} [header_height]
   * @return {undefined}
   */
  __handle_content_anchor_viewed(
    link_all_sel, sidebar_left_sel, anchor_id, header_height=0
  ) {
    let fn = "__handle_content_anchor_viewed";

    try {
      let _anchor_active_el = (
        (link_all_sel.filter(`[data-anchor="#${anchor_id}"]`) || [])[0] || null
      );

      if (_anchor_active_el !== null) {
        let _anchor_active_sel = this._$(_anchor_active_el);

        // Swap active attributes to active anchor link
        link_all_sel.removeAttr("data-active");
        _anchor_active_sel.attr("data-active", "true");

        // If active link belongs to a slice parent, then auto-expand this \
        //   slice
        let _level_active_sel = (
          _anchor_active_sel.parents(".nest-navigate-level--first").first()
        );

        if (_level_active_sel.length > 0  &&
              _level_active_sel.attr("data-expanded") !== "true") {
          // Trigger a virtual click event to toggle visibility
          let _toggle_active_sel = _level_active_sel.find(
            ".nest-navigate-link--slice .nest-navigate-toggle"
          );

          if (_toggle_active_sel.length > 0) {
            // Toggle sidebar nest level
            this.__toggle_sidebar_nest_level(
              _toggle_active_sel,

              true  //-[is_anchor]
            );
          }
        }

        // Ensure that active link is into view (otherwise, scroll to link)
        // Important: do not use 'smooth' scrolling, as we need the scroll \
        //   position change to be instant.
        _anchor_active_el.scrollIntoView({
          behavior : "auto",
          block    : "nearest"
        });

        // Element is hidden below header? Scroll a bit up once more (note \
        //   that this only applies when scrolling upwards)
        let _bounding_box = _anchor_active_el.getBoundingClientRect(),
            _bounding_top = Math.floor(_bounding_box.top || 0.0);

        if (_bounding_top < header_height) {
          sidebar_left_sel[0].scrollTop -= (header_height - _bounding_top);
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Handles code metas picker change event
   * @private
   * @param  {object} code_box_sel
   * @return {undefined}
   */
  __handle_code_metas_picker_change(code_box_sel) {
    let fn = "__handle_code_metas_picker_change";

    try {
      // Acquire code data
      let _code_data = (
        JSON.parse(code_box_sel.find(".code-data").val() || "{}")
      );

      // Select request and response targets
      let _section_request_sel  = (
        code_box_sel.find(".code-section.code-section--request")
      );
      let _section_response_sel = (
        code_box_sel.find(".code-section.code-section--response")
      );

      // Acquire selected values
      let _selected_request  = (
        _section_request_sel.find(".code-meta-picker select").val()
      );
      let _selected_response = (
        _section_response_sel.find(".code-meta-picker select").val()
      );

      // Acquire code chunk associated to selected request
      let _code_chunk = (_code_data[_selected_request] || null);

      // Re-compute code section for request?
      if (_code_chunk !== null) {
        this.__refresh_code_metas_picker_section(
          "request", code_box_sel, _section_request_sel, _selected_request,
            _code_chunk.request
        );

        // Acquire code chunk associated to selected response
        let _code_response = (
          _code_chunk.responses[parseInt(_selected_response, 10)] || null
        );

        // Re-compute code section for response?
        if (_code_response !== null) {
          this.__refresh_code_metas_picker_section(
            "response", code_box_sel, _section_response_sel, _selected_response,
              _code_response
          );
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Handles code block viewed event
   * @private
   * @param  {object} target_sel
   * @return {undefined}
   */
  __handle_code_block_viewed(target_sel) {
    let fn = "__handle_code_block_viewed";

    try {
      // Load full code box parent element? (if any)
      // Notice: only if it was not already previously loaded, also note that \
      //   this only applies to 'pre' element wrapped in a '.code' box \
      //   wrapper. Not all 'pre' are being wrapped as such, therefore this \
      //   is not necessary in all cases.
      let _code_box_sel = (
        target_sel.parents(".code[data-was-loaded=\"false\"]").first()
      );

      if (_code_box_sel.length > 0) {
        _code_box_sel[0].setAttribute("data-was-loaded", "true");

        // Trigger the first code box picker 'change' event to load default \
        //   code into view.
        this.__handle_code_metas_picker_change(_code_box_sel);
      }

      // Highlight code? Do not re-apply if already applied before.
      let _code_el = (
        target_sel.find("code[class*=\"language-\"]")[0] || null
      );

      if (_code_el !== null  &&
            _code_el.hasAttribute("data-viewed") !== true) {
        _code_el.setAttribute("data-viewed", "");

        window.Prism.highlightElement(_code_el);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Handles Crisp chat open click event
   * @private
   * @return {boolean} False value (prevents default click event)
   */
  __handle_crisp_chat_open_click() {
    let fn = "__handle_crisp_chat_open_click";

    try {
      if (typeof window.$crisp !== "undefined") {
        window.$crisp.do("chat:open");
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return false;
    }
  }


  /**
   * Handles Crisp chat feedback click event
   * @private
   * @return {boolean} False value (prevents default click event)
   */
  __handle_crisp_chat_feedback_click() {
    let fn = "__handle_crisp_chat_feedback_click";

    try {
      if (typeof window.$crisp !== "undefined") {
        // Open chatbox
        window.$crisp.do("chat:open");

        // Show feedback message? (if not already shown in current session)
        if (this.__crisp_chat_feedback_shown !== true) {
          this.__crisp_chat_feedback_shown = true;

          window.$crisp.push([
            "do",
            "message:show",

            [
              "text",

              (
                `Do you have feedback on this page? `                  +
                `Please reply to this message with your comments! :)`  +
                `\n\n`                                                 +
                `➡️ ${document.location.href}`
              )
            ]
          ]);
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    } finally {
      return false;
    }
  }


  /**
   * Injects search results
   * @private
   * @param  {object} results_sel
   * @param  {object} entries_sel
   * @param  {object} results
   * @return {undefined}
   */
  __inject_search_results(results_sel, entries_sel, results) {
    let fn = "__inject_search_results";

    try {
      // Generate results HTML
      let _results_html = "";

      for (let _i = 0; _i < results.length; _i++) {
        let _result = results[_i];

        // Generate result path HTML
        let _path_html   = "",
            _path_chunks = _result.path.split(" > ");

        for (let _j = 0; _j < _path_chunks.length; _j++) {
          _path_html += (
            this.__escape_html_text(_path_chunks[_j])
          );

          // Append separator?
          if (_path_chunks.length > 1 && _j < (_path_chunks.length - 1)) {
            _path_html += (
              "<span class=\"spotlight-entry-separator\"></span>"
            );
          }
        }

        // Acquire entry type
        let _type = (
          (_result.id.includes("#") === true) ? "anchor" : "page"
        );

        // Append whole result HTML to results HTML
        _results_html += (
          `<li class="spotlight-entry spotlight-entry--${_type}">`      +
            `<a class="spotlight-entry-link" href="${_result.id}">`     +
              `<span class="spotlight-entry-path font-sans-semibold">`  +
                _path_html                                              +
              `</span>`                                                 +

              `<h6 class="spotlight-entry-title font-sans-bold">`       +
                this.__escape_html_text(_result.title)                  +
              `</h6>`                                                   +

              (
                _result.summary ? (
                  `<p class="spotlight-entry-preview">`       +
                    this.__escape_html_text(_result.summary)  +
                  `</p>`
                ) : ""
              )                                                         +
            `</a>`                                                      +
          `</li>`
        );
      }

      // Inject generated HTML
      entries_sel.html(_results_html);

      // Select results
      let _results_sel = entries_sel.find(".spotlight-entry");

      // Select first result (if any)
      _results_sel.first().attr("data-selected", "true");

      // Make sure that scroll position is restored to top of scroll area
      if (results_sel.length > 0) {
        results_sel[0].scrollTop = 0;
      }

      // Bind mouse enter + mouse leave events on new results
      _results_sel.on("mouseenter", (event) => {
        try {
          _results_sel.removeAttr("data-selected");

          this._$(event.target).attr("data-selected", "true");
        } catch (_error) {
          Console.error(`${this.ns}.${fn}:mouseenter`, _error);
        }
      });

      // Bind click event on new results (just to auto-hide search in case an \
      //   anchor gets clicked)
      _results_sel.on("click", () => {
        try {
          // Close search immediately
          this.__close_search(
            true  //-[do_reset]
          );
        } catch (_error) {
          Console.error(`${this.ns}.${fn}:click`, _error);
        }
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Fetches status health (based on provider)
   * @private
   * @param  {string} provider
   * @param  {string} target
   * @return {undefined}
   */
  __fetch_status_health(provider, target) {
    switch (provider) {
      case "vigil": {
        // Vigil provider
        return fetch(`${target}/status/text/`, {
          mode : "cors"
        })
          .then((response) => {
            // Non-success response?
            if (response.status !== 200) {
              return Promise.reject(null);
            }

            // Examine the text in the response
            return response.text();
          });
      }

      case "crisp": {
        // Crisp Status provider
        return fetch(`${target}/includes/report/`, {
          mode : "cors"
        })
          .then((response) => {
            // Non-success response?
            if (response.status !== 200) {
              return Promise.reject(null);
            }

            // Examine the JSON in the response
            return response.json();
          })
          .then((report) => {
            // Extract health from report
            return Promise.resolve(report.health);
          });
      }

      default: {
        // Provider unknown, hard-fail
        return Promise.reject(null);
      }
    }
  }


  /**
   * Refreshes status indicator
   * @private
   * @param  {object} status_sel
   * @param  {object} seconds_sel
   * @return {undefined}
   */
  __refresh_status_indicator(status_sel, seconds_sel) {
    let fn = "__refresh_status_indicator";

    try {
      // Refresh status
      status_sel.attr(
        "data-status", (this.__status_poll_health || "none")
      );

      // Refresh 'last checked since' seconds
      seconds_sel.text(
        `${(this.__status_poll_last_check || 1)}`
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds search open keydown event
   * @private
   * @return {undefined}
   */
  __bind_search_open_keydown() {
    let fn = "__bind_search_open_keydown";

    try {
      const _KEY_CODE_K          = 75,
            _KEY_CODE_ESCAPE     = 27,
            _KEY_CODE_ENTER      = 13,
            _KEY_CODE_ARROW_UP   = 38,
            _KEY_CODE_ARROW_DOWN = 40;

      window.addEventListener("keydown", (event) => {
        switch (event.keyCode) {
          // 'K' pressed?
          case _KEY_CODE_K: {
            // Check if 'CTRL' is pressed (or 'COMMAND' on Mac computers)
            let _has_control = (
              ((navigator.platform || "").toLowerCase().indexOf("mac") !== -1) ?
                event.metaKey : event.ctrlKey
            );

            if (_has_control === true) {
              if (this.__search_opened !== true) {
                // Block 'CTRL + K' event default behavior (otherwise, browser \
                //   URL search prompt will be shown)
                event.preventDefault();

                // Open search
                this.__open_search();
              } else {
                // Close search
                // Notice: this will show the browser default URL search \
                //   prompt, letting the users press 'CTRL + K' twice quickly \
                //   if they want to perform a regular browser URL search.
                this.__close_search();
              }
            }

            break;
          }

          // 'ESCAPE' pressed?
          case _KEY_CODE_ESCAPE: {
            if (this.__search_opened === true) {
              // Block event default behavior
              event.preventDefault();

              // Close search
              this.__close_search();
            }

            break;
          }

          // 'ENTER' pressed?
          case _KEY_CODE_ENTER: {
            if (this.__search_opened === true) {
              // Block event default behavior
              event.preventDefault();

              // Select selected result
              let _result_selected_sel = this._$(
                "#search .spotlight-entry[data-selected=\"true\"] "  +
                  ".spotlight-entry-link"
              );

              // Open selected search result?
              if (_result_selected_sel.length > 0) {
                let _target_url = _result_selected_sel.first().attr("href");

                if (_target_url) {
                  // Close search immediately
                  this.__close_search(
                    true  //-[do_reset]
                  );

                  // Split hash part from target URL?
                  let _target_url_parts = _target_url.split("#");

                  // Navigate to URL? (if different than current one)
                  if (_target_url_parts[0] !== document.location.pathname) {
                    // Navigate to new full URL
                    document.location.href = _target_url;
                  } else if (_target_url_parts[1]) {
                    // Navigate to new hash (or same)
                    document.location.hash = `#${_target_url_parts[1]}`;
                  } else if ((document.location.hash || "").length > 1) {
                    // Reset current hash
                    document.location.hash = "";
                  }
                }
              }
            }

            break;
          }

          // 'ARROW UP' or 'ARROW DOWN' pressed?
          case _KEY_CODE_ARROW_UP:
          case _KEY_CODE_ARROW_DOWN: {
            if (this.__search_opened === true) {
              // Block event default behavior
              event.preventDefault();

              // Select search results
              let _results_all_sel = this._$("#search .spotlight-entry");

              // Compute increment
              let _increment = (
                (event.keyCode === _KEY_CODE_ARROW_DOWN) ? 1 : -1
              );

              // Select next or previous search result
              this.__toggle_search_result_selected(
                _results_all_sel, _increment
              );
            }

            break;
          }
        }
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds search open click event
   * @private
   * @return {undefined}
   */
  __bind_search_open_click() {
    let fn = "__bind_search_open_click";

    try {
      this._$("#header .search").on(
        "click", this.__open_search.bind(this)
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds search close click event
   * @private
   * @return {undefined}
   */
  __bind_search_close_click() {
    let fn = "__bind_search_close_click";

    try {
      this._$("#search").on("click", (event) => {
        try {
          if (event.target) {
            let _target_sel = this._$(event.target);

            // Click away from spotlight box? Close search.
            if (_target_sel.is("#search .spotlight") === true) {
              this.__close_search();
            }
          }
        } catch (_error) {
          Console.error(`${this.ns}.${fn}:click`, _error);
        }
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds search field keyup event
   * @private
   * @return {undefined}
   */
  __bind_search_field_keyup() {
    let fn = "__bind_search_field_keyup";

    try {
      // Select all targets
      let _spotlight_sel = this._$("#search .spotlight"),
          _input_sel     = _spotlight_sel.find(".spotlight-input"),
          _results_sel   = _spotlight_sel.find(".spotlight-results"),
          _entries_sel   = _results_sel.find(".spotlight-entries");

      // Initialize last search value
      _input_sel.on("keyup", (event) => {
        try {
          // Acquire normalized search query value
          let _field_value = (
            (event.target.value || "").trim().toLowerCase()
          );

          if (_field_value !== this.__search_field_value_last) {
            // Retain last search value
            this.__search_field_value_last = _field_value;

            // Define proceed function
            let _fnProceed = () => {
              this.__proceed_search_query(
                _spotlight_sel, _results_sel, _entries_sel, _field_value
              );
            };

            // Proceed immediately? (pending stack is not defined)
            if (this.__search_index_load_pending === null) {
              // Proceed immediately
              _fnProceed();
            } else {
              // Show load spinner (as search was deferred)
              _spotlight_sel.attr("data-index-loading", "true");

              // Stack for later (note: reset stack, as we do not want any \
              //   previous operation from being processed, only the last one)
              this.__search_index_load_pending = [_fnProceed];
            }
          }
        } catch (_error) {
          Console.error(`${this.ns}.${fn}:keyup`, _error);
        }
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds copy click event
   * @private
   * @return {undefined}
   */
  __bind_copy_click() {
    let fn = "__bind_copy_click";

    try {
      // Select all copy targets
      let _click_all_sel = this._$(".copy-button");

      // Bind all click events
      _click_all_sel.each((click_el) => {
        let _state_confirm_timeout = null;

        // Notice: use 'addEventListener' instead of '.on' as this is ~500% \
        //   faster, which avoids blocking page rendering for ~10ms when there \
        //   are a lot of copy elements.
        click_el.addEventListener("click", () => {
          try {
            // Find click parent (from clicked basis)
            let _click_parent_sel = this._$(click_el);

            if (_click_parent_sel.is(".copy") === false) {
              _click_parent_sel = _click_parent_sel.parents(".copy").first();
            }

            // Select clicked value
            let _value_sel = _click_parent_sel.find(".copy-value");

            if (_click_parent_sel.length > 0 && _value_sel.length > 0) {
              let _text_value = _value_sel.text();

              // Select text and copy it
              let _was_copied = this.__copy_text(_value_sel[0]);

              // Change state to 'copied'?
              if (_was_copied === true) {
                // Clear out state clear timeout (if any)
                if (_state_confirm_timeout !== null) {
                  clearTimeout(_state_confirm_timeout);
                }

                // Change state to 'copied'
                _click_parent_sel.attr("data-copy-state", "copied");

                // Schedule state clear timeout
                _state_confirm_timeout = setTimeout(() => {
                  _state_confirm_timeout = null;

                  // Change state back to 'none'
                  _click_parent_sel.attr("data-copy-state", "none");
                }, this.__copy_state_confirm_delay);
              }
            }
          } catch (_error) {
            Console.error(`${this.ns}.${fn}:click`, _error);
          }
        });
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds appearance toggle click event
   * @private
   * @return {undefined}
   */
  __bind_appearance_toggle_click() {
    let fn = "__bind_appearance_toggle_click";

    try {
      this._$("#header .coloring").on("click", () => {
        try {
          // Acquire new appearance mode
          let _new_mode = (
            (this.__appearance_mode === "light") ? "dark" : "light"
          );

          // Toggle appearance mode
          this.__toggle_appearance(_new_mode);

          // Remember choice (with a cookie)
          this.__write_cookie(
            "appearance-mode", _new_mode
          );
        } catch (_error) {
          Console.error(`${this.ns}.${fn}:click`, _error);
        }
      });
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds sidebar toggler click event
   * @private
   * @return {undefined}
   */
  __bind_sidebar_toggler_click() {
    let fn = "__bind_sidebar_toggler_click";

    try {
      let _sidebar_left_sel = (
        this._$("#content .sidebar.sidebar--left")
      );

      if (_sidebar_left_sel.length > 0) {
        // Bind sidebar toggler click events
        let _sidebar_togglers_sel = this._$(
          "#content .sidebar-toggler, #content .sidebar-toggler-retract"
        );

        _sidebar_togglers_sel.on("click", () => {
          try {
            // Compute new sidebar visibility state
            let _new_state = (
              (_sidebar_left_sel.attr("data-visible") === "true") ?
                "false" : "true"
            );

            // Toggle visible state on sidebar
            _sidebar_left_sel.attr("data-visible", _new_state);
          } catch (_error) {
            Console.error(`${this.ns}.${fn}:click`, _error);
          }
        });

        // Bind sidebar link click events (anchor links)
        let _sidebar_link_click = _sidebar_left_sel.find(
          ".nest-navigate-link[href^=\"#\"], .nest-navigate-slice[href^=\"#\"]"
        );

        if (_sidebar_link_click.length > 0) {
          _sidebar_link_click.on("click", () => {
            try {
              // Forcibly hide sidebar
              _sidebar_left_sel.attr("data-visible", "false");
            } catch (_error) {
              Console.error(`${this.ns}.${fn}:click`, _error);
            }
          });
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds sidebar nest level toggle click event
   * @private
   * @return {undefined}
   */
  __bind_sidebar_nest_level_toggle_click() {
    let fn = "__bind_sidebar_nest_level_toggle_click";

    try {
      this._$("#content .sidebar .nest .nest-navigate-toggle").on(
        "click",

        (event) => {
          // Toggle sidebar nest level?
          if (event.target) {
            this.__toggle_sidebar_nest_level(
              this._$(event.target)
            );
          }
        }
      );
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds content anchor viewed event
   * @private
   * @return {undefined}
   */
  __bind_content_anchor_viewed() {
    let fn = "__bind_content_anchor_viewed";

    try {
      let _sidebar_left_sel = (
        this._$("#content .sidebar.sidebar--left") || []
      );
      let _anchor_all_sel   = (
        this._$("#content .panes .content [id]") || []
      );
      let _link_all_sel     = (
        (_sidebar_left_sel.length > 0) ?
          _sidebar_left_sel.find(".nest-navigate-link[data-anchor^=\"#\"]") : []
      );

      // Anchors exist on page? Bind viewed listeners.
      if (_sidebar_left_sel.length > 0 && _anchor_all_sel.length > 0  &&
            _link_all_sel.length > 0) {
        // Bind intersection observer? (if browser API is available, otherwise \
        //   ignore, as this is only a nice-to-have feature)
        // Notice: this will apply anchor viewed markers when the anchor \
        //   comes into view.
        if (typeof window.IntersectionObserver !== "undefined") {
          // Acquire header height (used to compute root margins, ie. \
          //   accounting for the fact that an element that went into view but \
          //   is still sliding below the header, is not really into view yet)
          let _header_sel    = (this._$("#header") || []),
              _header_height = 0;

          if (_header_sel.length > 0) {
            _header_height = (
              _header_sel[0].offsetHeight || 0
            );
          }

          // Allocate viewed context
          let _viewed_context = {
            active  : null,
            visible : {}
          };

          // Create intersection observer
          let _observer = new IntersectionObserver(
            (entries) => {
              for (let _i = 0; _i < entries.length; _i++) {
                let _entry = entries[_i];

                if (_entry.target && _entry.target.id  &&
                      (_link_all_sel.filter(
                          `[data-anchor="#${_entry.target.id}"]`
                        ).length > 0)) {
                  // Entry intersecting?
                  if (_entry.isIntersecting === true) {
                    _viewed_context.visible[_entry.target.id] = true;
                  } else {
                    delete _viewed_context.visible[_entry.target.id];
                  }
                }
              }

              // Schedule content anchor viewed event? (only if active anchor \
              //   has changed; we need to find first active anchor from all \
              //   available anchors, ie. this is an ordered list)
              let _active_anchor = null;

              for (let _i = 0; _i < _anchor_all_sel.length; _i++) {
                let _cur_anchor_el = _anchor_all_sel[_i];

                // This anchor is visible? Stop there, as we found the first \
                //   visible anchor.
                if (_viewed_context.visible[_cur_anchor_el.id] === true) {
                  _active_anchor = _cur_anchor_el;

                  break;
                }
              }

              if (_active_anchor !== null  &&
                    _active_anchor !== _viewed_context.active) {
                this.__schedule_handle_content_anchor_viewed(
                  _link_all_sel, _sidebar_left_sel, _active_anchor.id,
                    _header_height
                );
              }

              // Apply new active item? (or retain last active if stack is \
              //   empty)
              if (_active_anchor !== null) {
                _viewed_context.active = _active_anchor;
              }
            },

            {
              threshold  : 0.0,

              rootMargin : (
                `${(-1 * _header_height)}px 0px 0px 0px`
              )
            }
          );

          // Bind intersection observer on all elements
          for (let _i = 0; _i < _anchor_all_sel.length; _i++) {
            _observer.observe(_anchor_all_sel[_i]);
          }
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds code metas picker change event
   * @private
   * @return {undefined}
   */
  __bind_code_metas_picker_change() {
    let fn = "__bind_code_metas_picker_change";

    try {
      let _code_meta_picker_all_sel = (
        this._$(".code .code-meta-picker select") || []
      );

      // Code boxes exist on page? Bind change listener on select.
      if (_code_meta_picker_all_sel.length > 0) {
        // Bind all change events
        _code_meta_picker_all_sel.each((picker_el) => {
          // Notice: use 'addEventListener' instead of '.on' as this is ~200% \
          //   faster, which avoids blocking page rendering for ~5ms when \
          //   there are a lot of select elements.
          picker_el.addEventListener("change", (event) => {
            try {
              let _code_box_sel = (
                this._$(event.target).parents(".code").first()
              );

              if (_code_box_sel.length > 0) {
                this.__handle_code_metas_picker_change(_code_box_sel);
              }
            } catch (_error) {
              Console.error(`${this.ns}.${fn}:change`, _error);
            }
          });
        });
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds code block viewed event
   * @private
   * @return {undefined}
   */
  __bind_code_block_viewed() {
    let fn = "__bind_code_block_viewed";

    try {
      let _pre_all_sel = (this._$("pre") || []);

      // Code blocks exist on page? Bind code block listener.
      if (_pre_all_sel.length > 0) {
        // Bind intersection observer? (if browser API is available)
        // Notice: this will apply code highlighting when the code block \
        //   enters into view, or will load code boxes when they enter into \
        //   view.
        if (typeof window.IntersectionObserver !== "undefined") {
          // Create intersection observer
          let _observer = new IntersectionObserver(
            (entries) => {
              // Code blocks entered into view?
              for (let _i = 0; _i < entries.length; _i++) {
                let _entry = entries[_i];

                // Entry intersecting?
                if (_entry.isIntersecting === true && _entry.target) {
                  // Handle code block viewed event
                  this.__handle_code_block_viewed(
                    this._$(_entry.target)
                  );
                }
              }
            },

            {
              threshold : 0.0
            }
          );

          // Bind intersection observer on all elements
          for (let _i = 0; _i < _pre_all_sel.length; _i++) {
            _observer.observe(_pre_all_sel[_i]);
          }
        } else {
          Console.warn(
            `${this.ns}.${fn}`, (
              "Optimized code block formatting is disabled, as the browser "  +
                "does not support the IntersectionObserver API."
            )
          );

          // Highlight all code elements, and load all code boxes, as the \
          //   browser does not support intersection observing (this is \
          //   obviously much slower and can degrade performances on page \
          //   first draw)
          for (let _i = 0; _i < _pre_all_sel.length; _i++) {
            // Trigger code block viewed event for block (virtual event, as \
            //   the code block is probably not even in view)
            this.__handle_code_block_viewed(
              this._$(_pre_all_sel[_i])
            );
          }
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds Markdown embed click event
   * @private
   * @return {undefined}
   */
  __bind_markdown_embed_click() {
    let fn = "__bind_markdown_embed_click";

    try {
      let _embed_preview_all_sel = (
        this._$(".embed .embed-preview") || []
      );

      // Embeds exist on page? Bind click listener (this injects embed content)
      if (_embed_preview_all_sel.length > 0) {
        _embed_preview_all_sel.on("click", (event) => {
          try {
            // Acquire embed parent
            let _embed_sel = this._$(event.target).parents(".embed").first();

            if (_embed_sel.length > 0) {
              let _injector = _embed_sel.attr("data-injector"),
                  _target   = _embed_sel.attr("data-target");

              if (_injector && _target) {
                // Generate injector code
                let _inject_code;

                switch (_injector) {
                  case "youtube": {
                    // Generate YouTube embed URL
                    let _youtube_url = (
                      "https://www.youtube.com/embed/" + _target  +
                        "?hl=en&rel=0&modestbranding=1&autoplay=1"
                    );

                    _inject_code = (
                      "<iframe "                         +
                        "type=\"text/html\" "            +
                        "width=\"560\" "                 +
                        "height=\"349\" "                +
                        "src=\"" + _youtube_url + "\" "  +
                        "frameborder=\"0\" "             +
                        "allowfullscreen>"               +
                      "</iframe>"
                    );

                    break;
                  }

                  default: {
                    // Injector is not supported.
                    _inject_code = null;
                  }
                }

                // Inject embedded content?
                if (_inject_code !== null) {
                  // Perform injection
                  _embed_sel.find(".embed-frame").html(_inject_code);

                  // Mark as loaded
                  _embed_sel.attr("data-loaded", "true");
                }
              }
            }
          } catch (_error) {
            Console.error(`${this.ns}.${fn}:click`, _error);
          }
        });
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds Crisp chat open click event
   * @private
   * @return {undefined}
   */
  __bind_crisp_chat_open_click() {
    let fn = "__bind_crisp_chat_open_click";

    try {
      // Bind chat open click listener? (if chatbox is included)
      if (typeof window.$crisp !== "undefined") {
        // Opens the Crisp chatbox
        let _chat_open_sel = (
          this._$("a[href='#crisp-chat-open']") || []
        );

        for (let _i = 0; _i < _chat_open_sel.length; _i++) {
          _chat_open_sel[_i].onclick = (
            this.__handle_crisp_chat_open_click.bind(this)
          );
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds Crisp chat feedback click event
   * @private
   * @return {undefined}
   */
  __bind_crisp_chat_feedback_click() {
    let fn = "__bind_crisp_chat_feedback_click";

    try {
      // Bind chat open click listener? (if chatbox is included)
      if (typeof window.$crisp !== "undefined") {
        // Binds to the feedback action link
        let _chat_feedback_sel = (
          this._$("a[href='#crisp-chat-feedback']") || []
        );

        for (let _i = 0; _i < _chat_feedback_sel.length; _i++) {
          _chat_feedback_sel[_i].onclick = (
            this.__handle_crisp_chat_feedback_click.bind(this)
          );
        }
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }


  /**
   * Binds status poll schedule
   * @private
   * @return {undefined}
   */
  __bind_status_poll_schedule() {
    let fn = "__bind_status_poll_schedule";

    try {
      // Pre-select all status targets
      let _status_sel = (
        this._$("#footer .status") || []
      );

      if (this.__url_status.provider && this.__url_status.target  &&
            _status_sel.length > 0) {
        let _seconds_sel = _status_sel.find(".status-time-seconds");

        // Stop any previously-set scheduler?
        if (this.__status_poll_scheduler !== null) {
          clearInterval(this.__status_poll_scheduler);
        }

        // Start new scheduler
        this.__status_poll_scheduler = setInterval(() => {
          // Increment last checked counter? (if we have an health status \
          //   defined)
          if (this.__status_poll_health !== null) {
            this.__status_poll_last_check += (
              this.__status_poll_interval / this.__second_in_milliseconds
            );
          }

          // Should we refresh health now?
          if (this.__status_poll_last_check === 0  ||
              ((this.__status_poll_last_check  *
                  this.__second_in_milliseconds)  >=
                this.__status_poll_refresh)) {
            // Fetch latest status page health
            this.__fetch_status_health(
              this.__url_status.provider, this.__url_status.target
            )
              .then((text) => {
                // Acquired status text health is unknown?
                if (this.__status_known_health.includes(text) !== true) {
                  return Promise.reject(null);
                }

                // Store acquired status text? (if health is known)
                this.__status_poll_health     = text;
                this.__status_poll_last_check = 0;

                return Promise.resolve();
              })
              .catch(() => {
                // Mark health refresh as failed?
                this.__status_poll_health     = "failure";
                this.__status_poll_last_check = 0;

                return Promise.resolve();
              })
              .then(() => {
                // Refresh the UI (both health and 'last checked' time counter)
                this.__refresh_status_indicator(_status_sel, _seconds_sel);
              });
          } else {
            // Refresh the UI (just the 'last checked' time counter)
            this.__refresh_status_indicator(_status_sel, _seconds_sel);
          }
        }, this.__status_poll_interval);
      }
    } catch (error) {
      Console.error(`${this.ns}.${fn}`, error);
    }
  }
}


window.Common = new Common();

window.Common._document_sel.ready(function() {
  window.Common.init();
});

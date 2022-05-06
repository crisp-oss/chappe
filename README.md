<img alt="Chappe" src="https://crisp-oss.github.io/chappe/images/chappe.png" width="300">

[![Test and Build](https://github.com/crisp-oss/chappe/workflows/Test%20and%20Build/badge.svg?branch=master)](https://github.com/crisp-oss/chappe/actions?query=workflow%3A%22Test+and+Build%22) [![NPM](https://img.shields.io/npm/v/chappe.svg)](https://www.npmjs.com/package/chappe) [![Downloads](https://img.shields.io/npm/dt/chappe.svg)](https://www.npmjs.com/package/chappe)

**Developer Docs builder. Write guides in Markdown and references in API Blueprint. Comes with a built-in search engine.**

Chappe is a Developer Docs builder, that produces static assets. No runtime, just lightweight static files. It was built to address SaaS companies needs, and can serve as a first-class modern alternative to hosted services such as [ReadMe](https://readme.com/).

The reason behind why we made Chappe is the following: while looking for a Developer Docs builder at [Crisp](https://crisp.chat/en/), all that we could find were either outdated open-source projects, or commercial documentation builders. We wanted a modern Developer Docs website hosted on our premises, as pure-static assets. The latter is especially important, as we do not want to rely on a plethora of external services that can go down anytime.

**Using Chappe is as easy as:**

1. Writing all your docs in Markdown;
2. Building your docs in a single command;
3. Finally, deploying static build assets to your Web servers (or GitHub Pages, Cloudflare Pages, etc. — _this can be automated via GitHub Actions_);

**😘 Maintainer**: [@valeriansaliou](https://github.com/valeriansaliou)

## Screenshots & Demo

**👉 See a live demo of Chappe on the [Crisp Developer Hub](https://docs.crisp.chat/).**

1️⃣ Chappe can generate your REST API reference:

[![Chappe References](https://crisp-oss.github.io/chappe/images/screenshot-references.gif)](https://docs.crisp.chat/references/rest-api/v1/)

2️⃣ It also generates Markdown-based developer guides:

[![Chappe Guides](https://crisp-oss.github.io/chappe/images/screenshot-guides.gif)](https://docs.crisp.chat/guides/rest-api/rate-limits/)

3️⃣ Oh, and it also lets your users search anything in your Developer Docs:

[![Chappe Search](https://crisp-oss.github.io/chappe/images/screenshot-search.gif)](https://docs.crisp.chat/)

_👉 Note that the search engine feature is 100% local. This means that it does not run on an external service like [Algolia](https://www.algolia.com/), though it does provides similar search performance and results. The search index is generated at build time as a JSON file, which gets loaded on-demand when the search box gets opened._

## Who uses it?

<table>
<tr>
<td align="center"><a href="https://crisp.chat/"><img src="https://crisp-oss.github.io/chappe/images/logo-crisp.png" width="64" /></a></td>
</tr>
<tr>
<td align="center">Crisp</td>
</tr>
</table>

_👋 You use Chappe and you want to be listed there? [Open an issue](https://github.com/crisp-oss/chappe/issues)._

## Last changes

The version history can be found in the [CHANGELOG.md](https://github.com/crisp-oss/chappe/blob/master/CHANGELOG.md) file.

## Features

* **Simple & fast**: generate a Developer Docs with optimized static assets. No runtime
* **Guides**: write developer guides in Markdown (rich content support: images, videos, tables, etc.)
* **References**: document your HTTP REST API specification using API Blueprint
* **Changes**: maintain a changelog of your platform (eg. your REST API, your SDKs)
* **RSS feed**: users can subscribe to your changelog over RSS
* **Beautiful Markdown rendering**: all content that you write gets rendered with a clear and modern style
* **Syntax highlighting**: coloring for your code examples in 100+ programming languages
* **Built-in search engine**: the index is generated during build and is hosted locally
* **Fully responsive**: full support of desktop, tablet and phone screens
* **Dark Mode**: read your docs either in light mode or dark mode
* **Customizable theme**: configure an accent color for your docs theme
* **SEO-friendly**: a deep sitemap is generated for search engines
* **Sharing-friendly**: support for the Open Graph protocol
* **Private pages support**: mark any guide or reference as private or unlisted (prefix its name with `_`)
* **Local preview server**: skip setting up a local Web server to preview your docs while writing them, Chappe embeds a preview server that can be started in a single command

_The following optional features can also be enabled:_

* **Chatbox**: integrate with the [Crisp Chatbox](https://crisp.chat/en/livechat/) to handle tech support and collect user feedback
* **Status page**: integrate with your [Vigil](https://github.com/valeriansaliou/vigil) status page to show live system status (can also be [Crisp Status](https://crisp.chat/en/status/))

## How to use it?

### Installation & Overview

To install and use Chappe, please follow those steps:

1. Create a new, empty Git repository;
2. Copy the `examples/acme-docs/` folder contents from the Chappe repository into your project root;
3. Run: `npm install` (make sure that you have a recent NodeJS version installed);
4. Run: `npx chappe serve` to build the docs and serve them over a local Web server (it will also watch for changes);
5. Open: [http://localhost:8040](http://localhost:8040/) in your Web browser to access your docs;
6. Write your Markdown guides and references in the `data/` directory (changes will be hot-reloaded in your browser);

Please refer to sections below for more details on how to write docs, customize Chappe, and deploy your final docs to your Web server.

### Configuration

The configuration of your Chappe docs is stored in a single JSON file, usually named `config.json`. Your configuration file will make references to images, such as your docs logo, which are stored in the `assets/` folder.

An empty definition of the Chappe configuration file is available in: [res/config/user.json](https://github.com/crisp-oss/chappe/blob/master/res/config/user.json), although you may rather want to see a filled example: [examples/acme-docs/config.json](https://github.com/crisp-oss/chappe/blob/master/examples/acme-docs/config.json) (if you copy-paste it, **make sure** to change all of its contents).

_👇 Notes on certain configuration rules can be found in the [Advanced settings](#%EF%B8%8F-advanced-settings) section._

### Chappe CLI usage

Chappe provides you with the `chappe` command, that builds your docs.

It supports the following actions, defaulting to `build` if none is specified:

* `build` to build docs
* `clean` to clean `dist/` and all temporary files
* `watch` to watch for changes and re-build (useful while writing docs)
* `serve` to serve built assets on your local/development computer (useful while testing and writing docs, **not used for production**)
* `lint` to run lints on Chappe internal resources

It supports the following parameters, with a default value if not set:

* `--config` (paths to the configuration files, comma-separated, _default value:_ `./config.json`)
* `--assets` (path to the assets directory, _default value:_ `./assets`)
* `--data` (path to the data directory, _default value:_ `./data`)
* `--dist` (path where to write built resources, _default value:_ `./dist`)
* `--temp` (path where to write temporary files, _default value:_ `./.chappe`)
* `--env` (environment, either `development` or `production`, _default value:_ `production`)

If you are running with the `serve` action, it accepts additional parameters:

* `--host` (hostname or IP address to use for the local/development server, _default value:_ `localhost`)
* `--port` (port number to use for the local/development server, _default value:_ `8040`)

Some special parameters are also available:

* `--quiet` (show less output when performing task)
* `--verbose` (show more output when performing task)
* `--example` (name of the Chappe docs example to build, useful for Chappe developers and quick tests, eg. `acme-docs`)

To build your docs, you can call the Chappe CLI as such:

```bash
npx chappe build --config=./config.json --assets=./assets --data=./data --dist=./dist
```

You can also call the Chappe CLI without any argument, in which case defaults will be used:

```bash
npx chappe build
```

By default, docs are built for a `production` target, meaning that all assets produced are optimized for speed and size. In most use cases, you will never need to set it to `development`, unless you are trying to extend or modify the Chappe core and therefore need to see uncompressed assets output.

To create a local development server on [http://localhost:8040](http://localhost:8040/), used to write and preview your docs, use:

```bash
npx chappe serve
```

_👉 If the `chappe` command is not found, make sure to add `chappe` to your `package.json` and call `npm install`._

### Writing docs

Docs can be either: `guides`, `references` or `changes`. The corresponding folders are stored in the `data/` directory, which is passed to the Chappe CLI whenever building your docs.

* `guides` are articles that walk your users through using your systems ([example here](https://docs.crisp.chat/guides/rest-api/rate-limits/)). They are written in Markdown, and are organized in sub-folders if deep nesting of guides in several sections is required. Chappe will auto-generate the navigation sidebar for you, based on this folder hierarchy.
* `references` are formal specifications of your systems (examples of: [API Blueprint](https://docs.crisp.chat/references/rest-api/v1/) and [Markdown](https://docs.crisp.chat/references/rtm-api/v1/)). They are written in [API Blueprint](https://apiblueprint.org/) for your HTTP REST API (a pseudo-Markdown format), or traditional Markdown for other systems (eg. a WebSocket server).
* `changes` is a timeline of updates that you made to your systems ([example here](https://docs.crisp.chat/changes/)). They are defined in a JSON format. In addition to the timeline, an RSS feed also gets generated at the `/changes.rss` URL.

### Deploying your docs

To deploy your docs:

1. First, create a Virtual Host on your Web server, using a dedicated domain, eg. `docs.acme.com`;
2. Then, build Chappe with `npx chappe build` (on your local computer or a CI/CD runner such as GitHub Actions);
3. Finally, copy the contents of the `dist/` folder to your server folder for your docs Virtual Host (eg. `/var/www/docs.acme.com`);

⚠️ Chappe **must** be hosted at the root of your docs domain — it **will not** work if hosted in a sub-directory!

Here is an example configuration file for NGINX on the Virtual Host `docs.acme.com`:

```
server {
  listen 443 ssl http2;
  server_name docs.acme.com;

  root /var/www/docs.acme.com;

  error_page 404 /not_found/;
}
```

_👉 Note that if possible, you should make sure that you have a rule to catch 404 errors and show the `not_found` page (as the NGINX configuration file above shows)._

## Syntax guide

### How to write guides?

Guides are stored within `guides/` in your data directory. A guide is stored as a Markdown file named `index.md` in a sub-directory with the guide name eg. `hello-world`. The sub-directory structure directly maps to the final URL that you get: for instance `guides/hello-world/index.md` results in eg. `http://docs.acme.com/guides/hello-world/`.

#### Structure of a guide file

Each guide Markdown file **must** start with a meta-data header, which holds information on:

* `TITLE`: The guide article name
  * Example: `TITLE: Hello World`
* `INDEX`: Number used to position the article relative to others in the navigation sidebar
  * Example: `INDEX: 1`
* `UPDATED`: The date at which the guide article has been updated
  * Example: `UPDATED: 2021-09-22`
* `LINK`: Additional navigation links to be added in the navigation sidebar
  * _Optional_, _Multiple possible_
  * Example: `LINK: Reference -> /references/rest-api/v1/`

Right after the header is defined, you can start writing Markdown for your guide, as normal.

An example of a full Markdown code for a guide is available at: [examples/acme-docs/data/guides/hello-world/index.md](https://raw.githubusercontent.com/crisp-oss/chappe/master/examples/acme-docs/data/guides/hello-world/index.md)

#### Adding icons to guide sections

Each guide main section can have its icon shown in the navigation sidebar (first-level sections only).

Section icons are defined in the `config.json` configuration file, within `images.categories.guides`. The section folder name, eg. `hello-world`, should be added to the `guides` object, associated to an SVG icon image from your `assets/` folder.

For example:

```json
{
  "images" : {
    "categories" : {
      "guides" : {
        "hello-world" : "images/categories/guides/hello-world.svg"
      }
    }
  }
}
```

#### List of special Markdown syntax

While the [Markdown specification](https://daringfireball.net/projects/markdown/syntax) defines most of the syntax that we need to build a full-featured Developer Docs (text formatting, images, tables, etc.), some non-standard elements had to be defined in Chappe.

---

##### Video embeds

To embed a video in a page, use the following Markdown syntax:

```markdown
${provider}[Video Title](video-id)
```

Supported providers: `youtube`

Example:

```markdown
${youtube}[In-depth Introduction to the Crisp RTM API](vS-h6k2ML6M)
```

---

##### Text emphasis (notice, info or warning blocks)

To insert text in an emphasis block, use one of the following Markdown syntaxes:

```markdown
! This is a notice text.
!! This is an info text.
!!! This is a warning text.
```

---

##### Image with caption

To insert an image with a caption, use the following Markdown syntax:

```markdown
$[Caption Text](![Image Title](image-path.png))
```

Example:

```markdown
$[Copy your Website ID](![](copy-website-id.png))
```

---

##### Navigation links

To insert a navigation block, with one or multiple links to other pages, use the following Markdown syntax:

```markdown
+ Navigation
  | Link Title 1: Link Description -> ./link/target/1/
  | Link Title 2: Link Description -> http://external-url.com/target/page/
```

Example:

```markdown
+ Navigation
  | Quickstart: Learn how to use the REST API in minutes. -> ./quickstart/
  | Authentication: Read how to authenticate to the REST API. -> ./authentication/
  | Rate-Limits: Learn about request rate-limits. -> ./rate-limits/
  | API Libraries: Libraries for your programming language. -> ./api-libraries/
```

---

##### Interact with the Crisp Chatbox

If you need to interact with the Crisp Chatbox from your Markdown code, you can include a traditional Markdown link with an URL pointing to special anchors.

The following anchors are available:

* Pop open the chatbox: `#crisp-chat-open`
* Prompt to submit feedback on the current page: `#crisp-chat-feedback`

Example:

```markdown
If you have any question on this guide, please [contact our chat support](#crisp-chat-open).
```

_👉 Note that this only works if you are using the Crisp Chatbox integration, and if the Crisp Chatbox is appearing on your docs._

---

### How to write references?

References are stored within `references/` in your data directory. A reference is stored either as an API Blueprint or Markdown file named for example `v1.md` for the API version, in a sub-directory corresponding to the name of the API, eg. `rest-api`. The sub-directory structure directly maps to the final URL that you get: for instance `references/rest-api/v1.md` results in eg. `http://docs.acme.com/references/rest-api/v1/`.

#### API Blueprint references

API Blueprint-formatted references are used to specify an HTTP REST API.

Each reference written with API Blueprint **must** start with a meta-data header, which holds information on:

* `TYPE`: The type of the reference
  * Value: `API Blueprint`
* `TITLE`: The reference title (with its version number)
  * Example: `TITLE: REST API Reference (V1)`
* `UPDATED`: The date at which the reference has been updated
  * Example: `UPDATED: 2021-12-22`

Immediately following, come API Blueprint meta-datas:

* `FORMAT`: The API Blueprint format (_do not change this_)
  * Value: `1A`
* `HOST`: The HTTP REST API host URL
  * Example: `https://api.crisp.chat/v1`

Then, a main title with the following mandatory content:

```markdown
# Reference
```

After that, you can specify all your HTTP REST API routes in API Blueprint as normal.

Also, note that as done with guides above, reference sections can have their own icon images. Section icons are defined in the `config.json` configuration file, within `images.categories.references`.

An example of a full API Blueprint code for a reference is available at: [examples/acme-docs/data/references/rest-api/v1.md](https://raw.githubusercontent.com/crisp-oss/chappe/master/examples/acme-docs/data/references/rest-api/v1.md)

#### Markdown references

Markdown-formatted references are used to specify anything that is not an HTTP REST API. For instance, a WebSocket endpoint, a network protocol or a programmatic interface.

Each reference Markdown file **must** start with a meta-data header, which holds information on:

* `TYPE`: The type of the reference
  * Value: `Markdown`
* `TITLE`: The reference title (with its version number)
  * Example: `TITLE: RTM API Reference (V1)`
* `UPDATED`: The date at which the reference has been updated
  * Example: `UPDATED: 2021-09-22`

After that, you can write the specification contents in Markdown.

Also, note that as done with guides above, reference sections can have their own icon images. Section icons are defined in the `config.json` configuration file, within `images.categories.references`.

An example of a full Markdown code for a reference is available at: [examples/acme-docs/data/references/rtm-api/v1.md](https://raw.githubusercontent.com/crisp-oss/chappe/master/examples/acme-docs/data/references/rtm-api/v1.md)

### How to write changelogs?

Changes are stored within `changes/` in your data directory. They are organized in JSON files for each year, eg. `2021.json`.

#### Structure of a changelog file

A changelog file for a year contains an array of all individual change entries. Think of it as a yearly feed of all dated changes.

For instance, a `2021.json` file with a single change would contain:

```json
[
  {
    "group" : "rest_api",
    "type"  : "change",
    "date"  : "2021-12-03",
    "text"  : "Markdown-formatted text for this change on the REST API."
  }
]
```

An example of a full changelog file is available at: [examples/acme-docs/data/changes/2021.json](https://raw.githubusercontent.com/crisp-oss/chappe/master/examples/acme-docs/data/changes/2021.json)

#### Allowed values for a change

A change is structured as such:

* `group`: the category of this change — _define your custom categories labels in `texts.changes.groups` and colors in `colors.changes.groups` within your `config.json`_;
* `type`: the type of the change (either: `change` or `deprecation`);
* `date`: a date for the change (formatted as: `YYYY-MM-DD`);
* `text`: the description text for the change, Markdown-formatted — _make sure that any URL you define there is a full URL, as this is also used in RSS feeds_

## ⚛️ Advanced settings

### Available code coloring

Code coloring rules for programming languages must be added manually, for each syntax that you intend use. As the rules are quite heavy for each syntax, Chappe includes none by default.

For instance, if you need to show examples of Java code, you'd need to add the `java` code coloring rule in `plugins.code.syntaxes` in your `config.json`. Chappe runs on [Prism](https://github.com/PrismJS/prism) for code coloring.

Most often used syntaxes are listed below (pick yours!):

```
markup
markup-templating
css
clike
c
javascript
bash
go
java
groovy
json
objectivec
php
python
ruby
rust
swift
objectivec
```

All available Prism rules can be found [here](https://github.com/PrismJS/prism/tree/master/components).

_👉 Note that some rules depend on others. For instance, `objectivec` requires the `c` rule to be also included. If you do not get code coloring for a certain syntax after including it, then it probably means that one of its dependency is missing. Please refer to the list of Prism components for more details._

### Check file sizes during build

Once Chappe is done building your docs, it checks for all built files sizes against maximum build size rules. This is done to ensure that you do not get bad surprises about your Developer Docs users experiencing slow load times, especially when including a lot of heavy images in guides.

In the event a build size rule threshold is reached, the Chappe CLI will error out, informing you which file is over-sized.

To adjust size thresholds or disable this checker rule, open your `config.json` file and refer to the `rules.build_size` property:

* To circumvent build failure when a file is over-sized, set the `fail` property to `false`;
* Maximum sizes can be adjusted where relevant with the `sizes` property (note that sizes are in bytes, so 10KB is about `10000`);

## 🙋 Common questions

### How can I customize my docs style?

In order to customize your docs style — _ie. override the default Chappe style past what can already be customized in the `config.json` configuration file_ — open `config.json` and look for the `includes` property (that contains `stylesheets`, that contains `urls` and `inline`).

You can easily deploy your own custom stylesheet on your docs domain, along with Chappe-generated `dist/` assets, with CSS classes overriding Chappe default styles:

```json
{
  "includes" : {
    "stylesheets" : {
      "urls"   : [
        "/overrides/style.css"
      ],

      "inline" : []
    }
  }
}
```

### How can I add scripts like Google Tag Manager?

To add inline scripts such as Google Tag Manager, open your `config.json` configuration file for Chappe, and look for the `includes` property (that contains `scripts`, that contains `urls` and `inline`).

Add a new entry to the `urls` and `inline` array, separately, giving eg.:

```json
{
  "includes" : {
    "scripts" : {
      "urls"   : [
        "https://www.googletagmanager.com/gtag/js?id={YOUR_GTM_ID}"
      ],

      "inline" : [
        "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag(\"js\", new Date());\ngtag(\"config\", \"{YOUR_GTM_ID}\");"
      ]
    }
  }
}
```

The `urls` property will include the JavaScript at the provided URL on all pages, while the `inline` property will append the inline JavaScript in a `script` element on all pages.

### How can I deploy my docs to GitHub Pages?

To build your docs to GitHub Pages, you will first need to host your docs project as a GitHub repository. Then, make sure that GitHub Actions is configured and running for your project.

You can then use the [deploy-to-github-pages](https://github.com/marketplace/actions/deploy-to-github-pages) action to proceed with building your docs via `npx chappe build` and then deploying the `dist/` folder to GitHub Pages.

### Where does the Chappe name come from?

Chappe was named after [Claude Chappe](https://en.wikipedia.org/wiki/Claude_Chappe), a French inventor, pioneer in long-distance communications. He invented the [optical telegraph](https://en.wikipedia.org/wiki/Optical_telegraph) (a.k.a. semaphore telegraph), later replaced by the [electrical telegraph](https://en.wikipedia.org/wiki/Electrical_telegraph). Those technologies were the founding blocks of what took over the world next: analog and digital telecommunications.

Quoting from his page on Wikipedia:

> This [the optical telegraph] was the first practical telecommunications system of the industrial age, and was used until the 1850s when electric telegraph systems replaced it.

_Credits to [Baptiste Jamin](https://github.com/baptistejamin) for the name idea._

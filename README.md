<p align="center">
  <a href="https://roots.io">
    <img alt="Palette Webpack Plugin" src="https://cdn.roots.io/app/uploads/logo-roots.svg" width="150">
  </a>
</p>

<p align="center">
  <a href="LICENSE.md">
    <img alt="MIT License" src="https://img.shields.io/github/license/roots/palette-webpack-plugin?color=%23525ddc&style=flat-square" />
  </a>

  <a href="https://www.npmjs.com/package/palette-webpack-plugin">
    <img alt="Version" src="https://img.shields.io/npm/v/palette-webpack-plugin?style=flat-square" />
  </a>

  <a href="https://www.npmjs.com/package/palette-webpack-plugin">
    <img alt="Total Downloads" src="https://img.shields.io/npm/dt/palette-webpack-plugin?style=flat-square" />
  </a>

   <a href="https://circleci.com/gh/roots/palette-webpack-plugin/">
    <img alt="Build Status" src="https://img.shields.io/circleci/build/github/roots/palette-webpack-plugin?style=flat-square" />
  </a>

  <a href="https://twitter.com/rootswp">
    <img alt="Follow Roots" src="https://img.shields.io/twitter/follow/rootswp.svg?style=flat-square&color=1da1f2" />
  </a>
</p>

<p align="center">
  <strong>Automatic Color Palette Generation</strong>
  <br />
  Built with ❤️
</p>

<p align="center">
  <a href="https://roots.io">Official Website</a> | <a href="https://www.patreon.com/rootsdev">Donate</a>
</p>

## Supporting

Palette Webpack Plugin is an open source project and completely free to use.

However, the amount of effort needed to maintain and develop new features and products within the Roots ecosystem is not sustainable without proper financial backing. If you have the capability, please consider donating using the links below:

<div align="center">

[![Donate via Patreon](https://img.shields.io/badge/donate-patreon-orange.svg?style=flat-square&logo=patreon)](https://www.patreon.com/rootsdev)
[![Donate via PayPal](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square&logo=paypal)](https://www.paypal.me/rootsdev)

</div>

## Overview

Palette Webpack Plugin allows you to generate a `JSON` file during the build process containing your color palette from existing [Sass maps](https://sass-lang.com/documentation/values/maps) and/or [Tailwind](https://tailwindcss.com).

While we hope someone may find this useful for other purposes, this plugin and it's output format were specifically built for handling WordPress' Gutenberg [`editor-color-palette`](https://developer.wordpress.org/block-editor/developers/themes/theme-support/) theme support feature.

## Features

- Built to take the headache out of maintaining the WordPress editor palette.
- Merge, filter, and sort Sass color maps and your Tailwind theme colors with a configurable priority.
- Uses computer vision algorithms to detect and deprioritize grayscale colors to the bottom of the list.
- Gracefully loads Sass and/or Tailwind support as needed.

## Getting Started

To begin, you'll need to install `palette-webpack-plugin`:

```bash
$ yarn add palette-webpack-plugin -D
```

Then add the plugin to your `webpack` config. Here is an example containing the default values:

**webpack.config.js**

```js
const PalettePlugin = require('palette-webpack-plugin');

module.exports = {
  plugins: [
    new PalettePlugin({
      output: 'palette.json',
      blacklist: ['transparent', 'inherit'],
      priority: 'tailwind',
      pretty: false,
      tailwind: {
        config: './tailwind.config.js',
        shades: false,
        path: 'colors'
      },
      sass: {
        path: 'resources/assets/styles/config',
        files: ['variables.scss'],
        variables: ['colors']
      }
    }),
  ],
};
```

If you are using [Laravel Mix](https://laravel-mix.com), you may use the Mix helper like so:

**webpack.mix.js**

```js
const mix = require('laravel-mix');
require('palette-webpack-plugin/src/mix');

mix.palette({ ... });
```

## Usage

The plugin's signature:

**webpack.config.js**

```js
module.exports = {
  plugins: [new PalettePlugin(options)],
};
```

**webpack.mix.js**

```js
mix.palette(options);
```

### Options

|        Name       	|     Type    	|               Default              	| Description                                                                                          	|
|:-----------------:	|:-----------:	|:----------------------------------:	|------------------------------------------------------------------------------------------------------	|
|      `output`     	|  `{String}` 	|          `'palette.json'`          	| The filename and path relative to the public path.                                                   	|
|    `blacklist`    	|  `{Array}`  	|     `['transparent, 'inherit']`    	| Globs to ignore colors.                                                                              	|
|     `priority`    	|  `{String}` 	|            `'tailwind'`            	| Priority when merging non-unique colors while using both Tailwind and Sass.                           	|
|      `pretty`     	| `{Boolean}` 	|               `false`              	| Use pretty formatting when writing the JSON file.                                                    	|
|     `tailwind`    	|  `{Object}` 	|              `{ ... }`             	| Set Tailwind options. (See below)                                                                    	|
| `tailwind.config` 	|  `{String}` 	|      `'./tailwind.config.js'`      	| Path to the Tailwind configuration file relative to the project root path.                           	|
| `tailwind.shades` 	| `{Array\|Boolean}` 	|               `false`              	| While set to `true`, every color shade (`100-900`) will be generated. Optionally, you may pass an array of shades. When set to `false`, only `500` is used. 	|
| `tailwind.path` 	| `{String}` 	|               `'colors'`              	| Path to Tailwind config values for palette colors in dot notation. Uses Tailwind's color palette `theme('colors')` per default. 	|
|       `sass`      	|  `{Object}` 	|              `{ ... }`             	| Set Sass options. (See below)                                                                        	|
|    `sass.path`    	|  `{String}` 	| `'resources/assets/styles/config'` 	| Path to Sass variable files relative to the project root path.                                       	|
|    `sass.files`   	|  `{Array}`  	|        `['variables.scss']`        	| An array of files to search for the defined Sass variables.                                          	|
|  `sass.variables` 	|  `{Array}`  	|            `['colors']`            	| An array of Sass variables (with or without `$`) to use for the color palette.                       	|

### WordPress

#### Vanilla WordPress

The general idea is to [`file_get_contents()`](https://www.php.net/manual/en/function.file-get-contents.php) and [`json_decode()`](https://www.php.net/manual/en/function.json-decode.php) the palette and pass it to `add_theme_support('editor-color-palette', $palette)`.

Here is an example of doing that:

```php
/**
 * Register the initial theme setup.
 *
 * @return void
 */
add_action('after_setup_theme', function () {
    /**
     * Enable theme color palette support
     * @link https://developer.wordpress.org/block-editor/developers/themes/theme-support/#block-color-palettes
     */
    add_theme_support('editor-color-palette', json_decode(file_get_contents('path/to/palette.json'), true));
}, 20);
```

#### Sage 10

When using Sage 10, you can take advantage of the `asset()` helper to fetch the palette. A good place for doing this would be in `setup.php` with the other `add_theme_support()` options.                  

```php
/**
 * Enable theme color palette support
 * @link https://developer.wordpress.org/block-editor/developers/themes/theme-support/#block-color-palettes
 */
add_theme_support('editor-color-palette', json_decode(asset('palette.json')->contents(), true));
```

## Output Example

```scss
$black: '#111';

$colors: (
  'red': '#f54242',
  'black': $black,
  'not-actually-black': '#42f596',
  'random-gray': '#858c89',
  'white': '#fff',
  'blue': '#4287f5',
  'orange': '#f5b342',
);
```

would be transformed to:

```json
[
  { "name": "Blue", "slug": "blue", "color": "#4287f5" },
  { "name": "Not Actually Black", "slug": "not-actually-black", "color": "#42f596" },
  { "name": "Orange", "slug": "orange", "color": "#f5b342" },
  { "name": "Red", "slug": "red", "color": "#f54242" },
  { "name": "Black", "slug": "black", "color": "#111" },
  { "name": "Random Gray", "slug": "random-gray", "color": "#858c89" },
  { "name": "White", "slug": "white", "color": "#fff" }
]
```

## Contributing

Contributions are welcome from everyone. We have [contributing guidelines](https://github.com/roots/guidelines/blob/master/CONTRIBUTING.md) to help you get started.

## Todo

- [ ] Add tests.
- [ ] Split into components.
- [ ] Convert to TypeScript?

## Community

Keep track of development and community news.

* Participate on the [Roots Discourse](https://discourse.roots.io/)
* Follow [@rootswp on Twitter](https://twitter.com/rootswp)
* Read and subscribe to the [Roots Blog](https://roots.io/blog/)
* Subscribe to the [Roots Newsletter](https://roots.io/subscribe/)
* Listen to the [Roots Radio podcast](https://roots.io/podcast/)

## License

Palette Webpack Plugin is provided under the [MIT License](https://github.com/roots/palette-webpack-plugin/blob/master/LICENSE.md).

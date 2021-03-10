const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const { color: d3Color } = require('d3-color');
const { hsv: d3Hsv } = require('d3-hsv');

class PaletteWebpackPlugin {
  /**
   * Register the component.
   *
   * @param {Object} options
   */
  constructor(options) {
    this.options = _.merge(
      {
        output: 'palette.json',
        blacklist: ['transparent', 'inherit'],
        priority: 'tailwind',
        pretty: false,
        tailwind: {
          config: './tailwind.config.js',
          shades: false,
          path: 'colors',
        },
        sass: {
          path: 'resources/assets/styles/config',
          files: ['variables.scss'],
          variables: ['colors'],
        },
      },
      options || {}
    );

    this.palette = this.options.priority.includes('tailwind')
      ? this.build(this.tailwind(), this.sass())
      : this.build(this.sass(), this.tailwind());
  }

  /**
   * Add Palette to the webpack build process.
   *
   * @param {Object} compiler
   */
  apply(compiler) {
    const palette = JSON.stringify(
      this.palette,
      null,
      this.options.pretty ? 2 : null
    );

    if (compiler.hooks) {
      compiler.hooks.emit.tapAsync(
        this.constructor.name,
        (compilation, callback) => {
          Object.assign(compilation.assets, {
            [this.options.output]: {
              source() {
                return palette;
              },
              size() {
                return palette.length;
              },
            },
          });

          callback();
        }
      );
    }
  }

  /**
   * Builds a flattened array containing descriptive color objects in a format
   * compatible with the WordPress `editor-color-palette` theme support feature.
   *
   * @see {@link https://developer.wordpress.org/block-editor/developers/themes/theme-support/}
   * @param {Object} objects
   */
  build(...objects) {
    const collection = _.uniqBy(_.union(...objects), 'name');

    const [colors, maybeColors] = _.partition(
      collection,
      (value) => !!d3Color(value.color)
    );
    const [falsePositives, notColors] = _.partition(maybeColors, (value) =>
      /^(?:rgb|hsl)a?\(.+?\)$/i.test(value.color)
    );
    const [grayscale, notGrayscale] = _.partition(
      colors,
      (value) =>
        this.isGrayscale(value.color) || this.maybeGrayscale(value.color)
    );

    return [
      [...notGrayscale, ...falsePositives, ...notColors],
      grayscale,
    ].flatMap((color) => _.sortBy(color, 'name'));
  }

  /**
   * Fetch and parse Sass theme colors if they are available.
   */
  sass() {
    if (!this.options.sass || !this.options.sass.files) {
      return;
    }

    const paths = this.options.sass.path
      ? _.endsWith('/', this.options.sass.path)
        ? this.options.sass.path
        : [this.options.sass.path, '/'].join('')
      : null;

    const files = [this.options.sass.files].map((file) => {
      if (this.exists([paths, file].join(''))) {
        return [paths, file].join('');
      }
    });

    if (!files) {
      return;
    }

    const variables = require('sass-export')
      .exporter({ inputFiles: files })
      .getArray();

    if (!variables.length) {
      return;
    }

    return variables
      .filter(
        (key) =>
          [this.options.sass.variables].some(
            (value) =>
              key.name ===
              (_.startsWith(value, '$') ? value : ['$', value].join(''))
          ) && key.mapValue
      )
      .flatMap((colors) =>
        colors.mapValue.map((color) =>
          this.transform(color.name, color.compiledValue, true)
        )
      );
  }

  /**
   * Fetch and parse Tailwind theme colors if they are available.
   */
  tailwind() {
    if (!this.options.tailwind || !this.exists(this.options.tailwind.config)) {
      return [];
    }

    const config = require('tailwindcss/resolveConfig')(
      require(path.resolve(this.options.tailwind.config))
    );

    this.tailwind = _.get(
      config,
      `theme.${this.options.tailwind.path || 'colors'}`,
      {}
    );

    return Object.keys(this.tailwind)
      .flatMap((key) => {
        if (!key || this.options.blacklist.includes(key)) {
          return;
        }

        if (_.isString(this.tailwind[key])) {
          return this.transform(key);
        }

        if (
          !this.options.tailwind.shades &&
          this.tailwind[key].hasOwnProperty('500')
        ) {
          return this.transform(key, '500');
        }

        if (_.isArray(this.options.tailwind.shades)) {
          return Object.keys(this.tailwind[key])
            .filter((value) => this.options.tailwind.shades.includes(value))
            .map((value) => this.transform(key, value));
        }

        if (_.isObject(this.options.tailwind.shades)) {
          return Object.keys(this.tailwind[key])
            .filter((value) =>
              Object.keys(this.options.tailwind.shades).includes(value)
            )
            .map((value) => this.transform(key, value));
        }

        return Object.keys(this.tailwind[key]).map((value) =>
          this.transform(key, value)
        );
      })
      .filter((value) => !!value);
  }

  /**
   * Transform a color key and value into a more descriptive object.
   *
   * @param {String}  key
   * @param {String}  value
   * @param {Boolean} isSass
   */
  transform(key, value, isSass = false) {
    if (isSass) {
      return {
        name: this.title(key),
        slug: key,
        color: value,
      };
    }

    if (!value) {
      return {
        name: this.title(key),
        slug: key,
        color: this.tailwind[key],
      };
    }

    if ('default' == value.toLowerCase()) {
      return {
        name: this.title(key),
        slug: key,
        color: this.tailwind[key][value],
      };
    }

    return {
      name: this.options.tailwind.shades
        ? this.title(key, value)
        : this.title(key),
      slug: `${key}-${value}`,
      color: this.tailwind[key][value],
    };
  }

  /**
   * Returns a title cased string.
   *
   * @param {String} value
   * @param {String} description
   */
  title(value, description) {
    value = _.startCase(_.camelCase(value));

    if (
      !_.isEmpty(description) &&
      _.isObject(this.options.tailwind.shades) &&
      _.has(this.options.tailwind.shades, description)
    ) {
      return _.trim(`${this.options.tailwind.shades[description]} ${value}`);
    }

    return (
      value + (!_.isEmpty(description) ? ` (${this.title(description)})` : '')
    );
  }

  /**
   * Checks if a file exists.
   *
   * @param {String|Array} files
   */
  exists(files) {
    if (Array.isArray(files) && files.length) {
      return (this.options.sass.files =
        files.filter((file) => {
          return fs.existsSync(file);
        }) || false);
    }

    return fs.existsSync(files);
  }

  /**
   * Check if a color is grayscale.
   *
   * @param {String} color
   */
  isGrayscale(color) {
    const { r, g, b } = d3Color(color);

    return r === g && r === b;
  }

  /**
   * Build a curve to find colors that visually look like grayscale.
   *
   * Shout out to Austin Pray <austin@austinpray.com>
   * for the big brain plays on color sorting.
   *
   * @param {String} color
   */
  maybeGrayscale(color) {
    const { h, s, v } = d3Hsv(color);

    /**
     * HSV is a cylinder where the central vertical axis comprises
     * the neutral, achromatic, or gray colors.
     * (image: https://w.wiki/Fsg)
     *
     * Let's build a curve to find colors that look like grayscale...
     *
     * v = 1.3/(1+8.5*s)
     * https://www.wolframalpha.com/input/?i=plot+v+%3D+1.3%2F%281%2B8.5*s%29+from+v%3D0+to+1+and+s%3D0+to+1
     *
     * Good enough for government work. Now let's see if the value
     * falls below the curve.
     */
    return v < 1.3 / (1 + 8.5 * s);
  }
}

module.exports = PaletteWebpackPlugin;

const mix = require('laravel-mix');
const PalettePlugin = require('./index');

class Palette {
  /**
   * The optional name to be used when called by Mix.
   */
  name() {
    return ['colors', 'palette'];
  }

  /**
   * Register the component.
   *
   * @param {Object} options
   */
  register(options) {
    this.options = options || {};
  }

  /**
   * Plugins to be merged with the master webpack config.
   */
  webpackPlugins() {
    return new PalettePlugin(this.options);
  }
}

mix.extend('palette', new Palette());

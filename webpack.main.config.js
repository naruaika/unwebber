const plugins = require('./webpack.plugins');

module.exports = {
  entry: './src/main.js',
  module: {
    rules: require('./webpack.rules'),
  },
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.jsx', '.css'],
  },
};

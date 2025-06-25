const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = [
  new CopyWebpackPlugin({
    patterns: [
      {
        from: path.resolve(__dirname, 'res/icons/unwebber.ico'),
        to: path.resolve(__dirname, '.webpack'),
      },
    ]
  })
];

const path = require('path');

module.exports = {
  entry: {
      bundle: './js/network.js',
  },
  output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    watchFiles: ['js/**/*.js', 'public/**/*'],
    liveReload: true,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
};
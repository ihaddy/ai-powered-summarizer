const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './public', to: '.', globOptions: { ignore: ['**/index.html'] } },
        { from: '../manifest.json', to: 'manifest.json' },
        { from: './public/icons', to: 'icons' },
        { from: './src/background.js', to: 'background.js' },
        { from: './src/content.js', to: 'content.js' },
        { from: './src/popup.html', to: 'popup.html' },
        { from: './src/popup.js', to: 'popup.js' },
        { from: '../config.js', to: 'config.js' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  devServer: {
    contentBase: path.join(__dirname, 'build'),
    compress: true,
    port: 3001
  }
};

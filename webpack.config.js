const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const path = require('path')
const os = require('os')

module.exports = {
  entry: './src/model.ts',
  module: {
    rules: [
      {
        test: /\.ts/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'model.js',
    library: 'min-model',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    sourceMapFilename: 'model.map'
  },
  resolve: {
    extensions: [ '.ts' ]
  },
  mode: 'production',
  optimization: {
    usedExports: true,
    minimizer: [
      new UglifyJsPlugin({
        parallel: os.cpus().length,
        sourceMap: true
      })
    ]
  }
}

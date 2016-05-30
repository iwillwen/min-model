import nodeResolve from 'rollup-plugin-node-resolve'
import builtins from 'rollup-plugin-node-builtins'
import uglify from 'rollup-plugin-uglify'
import babel from 'rollup-plugin-babel'

export default {
  entry: 'src/model.js',
  plugins: [
    babel({
      presets: [ 'es2015-rollup' ]
    }),
    builtins(),
    nodeResolve({
      jsnext: true,
      main: true
    }),
    uglify()
  ],

  format: 'umd',
  moduleName: 'Model',
  dest: 'dest/model.js'
}
const { NODE_ENV } = process.env

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: NODE_ENV === 'test' ? 'auto' : false
      }
    ]
  ],
  plugins: ['@babel/plugin-transform-explicit-resource-management'],
  env: {
    test: {
      plugins: ['babel-plugin-transform-import-meta']
    }
  }
}

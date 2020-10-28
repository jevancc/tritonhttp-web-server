module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es2021': true,
  },
  'extends': [
    'google',
  ],
  'parserOptions': {
    'ecmaVersion': 12,
  },
  'rules': {
    'no-unused-vars': 'off',
    'max-len': ['error', {'code': 120}],
    'require-jsdoc': 'off',
  },
};

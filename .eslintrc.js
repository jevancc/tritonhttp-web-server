module.exports = {
  'env': {
    'browser': true,
    'commonjs': true,
    'es2021': true,
  },
  'extends': [
    'google',
    'prettier',
  ],
  'parserOptions': {
    'ecmaVersion': 12,
  },
  'rules': {
    'object-curly-spacing': ['error', 'always'],
    'no-unused-vars': 'off',
    'max-len': ['error', { 'code': 120 }],
    'require-jsdoc': 'off',
  },
};

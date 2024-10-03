module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'vue',
    'prettier'
  ],
  rules: {
    'prettier/prettier': ['error', { 'endOfLine': 'auto' }],
    'vue/multi-word-component-names': 0,  // Desativa a regra de multi-palavra se necessário
  },
};

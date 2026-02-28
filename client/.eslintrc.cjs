module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  // @typescript-eslint/parser handles modern JS including class decorators
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended", "prettier"],
  rules: {
    // Ember injects services as class fields accessed via this.*; ESLint
    // correctly sees them used, but class-field declarations read as unused vars
    // to some rule sets — disable the base rule in favour of the TS variant.
    "no-unused-vars": "off",
    // Ember globals (e.g. require) are handled by ember-cli; disable undef here.
    "no-undef": "off",
  },
};

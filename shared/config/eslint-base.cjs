module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "unused-imports"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  rules: {
    "import/no-unresolved": "off",
    "unused-imports/no-unused-imports": "error",
    "@typescript-eslint/no-explicit-any": "off"
  }
};

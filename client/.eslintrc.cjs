module.exports = {
  extends: ["../shared/config/eslint-base.cjs"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json"
  }
};

module.exports = {
  extends: ["./config/eslint-base.cjs"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json"
  }
};

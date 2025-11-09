const buildPrettierCommand = (files) =>
  `pnpm exec prettier --write ${files.join(" ")}`;

const buildEslintCommand = (files) =>
  `pnpm exec eslint --max-warnings=0 --fix ${files.join(" ")}`;

module.exports = {
  "*.{ts,tsx,js,jsx}": (files) => [
    buildPrettierCommand(files),
    buildEslintCommand(files)
  ],
  "*.{json,md,css}": (files) => buildPrettierCommand(files)
};

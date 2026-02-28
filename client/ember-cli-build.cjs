/** @type {import('ember-cli').EmberApp} */
module.exports = function (defaults) {
  const EmberApp = require('ember-cli/lib/broccoli/ember-app');
  const app = new EmberApp(defaults, {
    autoImport: {},
  });
  return app.toTree();
};


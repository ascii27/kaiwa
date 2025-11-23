"use strict";

module.exports = function (environment) {
  let ENV = {
    modulePrefix: "client-ember",
    environment,
    rootURL: "/",
    locationType: "history",
    EmberENV: {
      EXTEND_PROTOTYPES: false,
    },
    APP: {
      LOG_LEVEL: process.env.LOG_LEVEL || "info",
      API_URL: process.env.VITE_API_URL || "",
      WS_URL: process.env.VITE_WS_URL || "",
    },
  };

  // In development, prefer proxying API and WS via Ember CLI to avoid CORS
  if (environment === 'development') {
    ENV.APP.API_URL = '';
    ENV.APP.WS_URL = '';
  }

  return ENV;
};

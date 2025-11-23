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
      API_URL: process.env.VITE_API_URL || "http://localhost:4000",
      WS_URL: process.env.VITE_WS_URL || "ws://localhost:4000",
    },
  };

  return ENV;
};

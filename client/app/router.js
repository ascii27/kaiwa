import EmberRouter from "@ember/routing/router";
import config from "client-ember/config/environment";

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route("home", { path: "/" });
  this.route("auth");
  this.route("conversation");
  this.route("review");
  this.route("settings");
  this.route("admin");
});

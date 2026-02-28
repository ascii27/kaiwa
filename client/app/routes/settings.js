import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class SettingsRoute extends Route {
  @service api;
  @service logger;
  @service settings;
  @service session;

  async model() {
    this.logger.info("route.enter", { route: "settings" });
    if (!this.session.token) {
      this.replaceWith("auth");
      return {};
    }
    await this.settings.load();
    return {};
  }
}

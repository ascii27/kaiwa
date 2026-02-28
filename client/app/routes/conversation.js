import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class ConversationRoute extends Route {
  @service api;
  @service logger;
  @service settings;
  @service session;

  beforeModel() {
    if (!this.session.token) {
      this.replaceWith("auth");
    }
  }

  async model() {
    this.logger.info("route.enter", { route: "conversation" });
    try {
      const lang = this.settings.targetLang || "japanese";
      const level = this.settings.level || "beginner";
      const { templates } = await this.api.listTemplates(lang, level);
      return { templates, language: lang, level };
    } catch (e) {
      this.logger.error("templates.load_failed", { message: e.message });
      return { templates: [], language: this.settings.targetLang, level: this.settings.level };
    }
  }
}

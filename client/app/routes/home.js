import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

const EMPTY_DASHBOARD = {
  stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, vocabularyLearned: 0 },
  level: null,
  levelNote: null,
  guidance: [{ type: "default" }],
  vocabSummary: { new: 0, learning: 0, mastered: 0 },
  recentSessions: [],
};

export default class HomeRoute extends Route {
  @service api;
  @service logger;
  @service session;

  beforeModel() {
    if (!this.session.token) {
      this.replaceWith("auth");
    }
  }

  async model() {
    this.logger.info("route.enter", { route: "home" });
    try {
      return await this.api.getDashboard(this.session.token);
    } catch (e) {
      this.logger.warn("home.load_failed", { message: e.message });
      return EMPTY_DASHBOARD;
    }
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.stats = model.stats;
    controller.level = model.level;
    controller.levelNote = model.levelNote;
    controller.guidance = model.guidance ?? [];
    controller.vocabSummary = model.vocabSummary;
    controller.recentSessions = model.recentSessions ?? [];
  }
}

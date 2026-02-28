import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class ReviewRoute extends Route {
  @service api;
  @service logger;
  @service session;

  beforeModel() {
    if (!this.session.token) {
      this.replaceWith("auth");
    }
  }

  async model() {
    this.logger.info("route.enter", { route: "review" });
    try {
      const { items } = await this.api.getDueVocab(this.session.token);
      return { items: items ?? [] };
    } catch (e) {
      this.logger.warn("review.load_failed", { message: e.message });
      return { items: [] };
    }
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.items = model.items;
    controller.currentIndex = 0;
    controller.showAnswer = false;
    controller.roundComplete = false;
    controller.noItemsDue = model.items.length === 0;
  }
}

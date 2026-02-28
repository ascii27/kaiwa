import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class ReviewController extends Controller {
  @service api;
  @service session;
  @service logger;

  @tracked items = [];
  @tracked currentIndex = 0;
  @tracked showAnswer = false;

  get currentItem() {
    return this.items[this.currentIndex];
  }

  get isDone() {
    return this.currentIndex >= this.items.length;
  }

  @action reveal() {
    this.showAnswer = true;
  }

  @action async grade(mastery) {
    const item = this.currentItem;
    if (!item) return;
    try {
      await this.api.updateVocabMastery(this.session.token, item.sessionId, item.id, mastery);
    } catch (err) {
      this.logger.warn("review.grade_failed", { message: err.message });
    }
    this.currentIndex = this.currentIndex + 1;
    this.showAnswer = false;
  }

  @action async restart() {
    try {
      const { items } = await this.api.getDueVocab(this.session.token);
      this.items = items ?? [];
    } catch (err) {
      this.logger.warn("review.reload_failed", { message: err.message });
      this.items = [];
    }
    this.currentIndex = 0;
    this.showAnswer = false;
  }
}

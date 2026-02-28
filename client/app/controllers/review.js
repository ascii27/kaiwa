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
  @tracked roundComplete = false;
  @tracked noItemsDue = false;

  get currentItem() {
    return this.items[this.currentIndex];
  }

  get currentNumber() {
    return this.currentIndex + 1;
  }

  get isDone() {
    return this.roundComplete || this.noItemsDue;
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
    const nextIndex = this.currentIndex + 1;
    this.currentIndex = nextIndex;
    this.showAnswer = false;
    if (nextIndex >= this.items.length) {
      this.roundComplete = true;
    }
  }

  @action async startNewRound() {
    this.roundComplete = false;
    this.noItemsDue = false;
    this.currentIndex = 0;
    this.showAnswer = false;
    try {
      const { items } = await this.api.getDueVocab(this.session.token);
      this.items = items ?? [];
      if (this.items.length === 0) {
        this.noItemsDue = true;
      }
    } catch (err) {
      this.logger.warn("review.reload_failed", { message: err.message });
      this.items = [];
      this.noItemsDue = true;
    }
  }
}

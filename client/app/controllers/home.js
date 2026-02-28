import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class HomeController extends Controller {
  @service router;

  @tracked stats = { totalSessions: 0, totalMinutes: 0, currentStreak: 0, vocabularyLearned: 0 };
  @tracked level = null;
  @tracked levelNote = null;
  @tracked guidance = [];
  @tracked vocabSummary = { new: 0, learning: 0, mastered: 0 };
  @tracked recentSessions = [];

  get vocabTotal() {
    return (
      (this.vocabSummary.new ?? 0) +
      (this.vocabSummary.learning ?? 0) +
      (this.vocabSummary.mastered ?? 0)
    );
  }

  get newPct() {
    return this.vocabTotal === 0
      ? 0
      : Math.round(((this.vocabSummary.new ?? 0) / this.vocabTotal) * 100);
  }

  get learningPct() {
    return this.vocabTotal === 0
      ? 0
      : Math.round(((this.vocabSummary.learning ?? 0) / this.vocabTotal) * 100);
  }

  get masteredPct() {
    return this.vocabTotal === 0
      ? 0
      : Math.round(((this.vocabSummary.mastered ?? 0) / this.vocabTotal) * 100);
  }

  get hasVocab() {
    return this.vocabTotal > 0;
  }

  get displayLevel() {
    return this.level ?? "Not set";
  }

  @action goToReview() {
    this.router.transitionTo("review");
  }

  @action startConversation() {
    this.router.transitionTo("conversation");
  }

  @action goToSettings() {
    this.router.transitionTo("settings");
  }
}

import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service api;
  @service logger;
  @service settings;

  async beforeModel() {
    this.logger.info('app.beforeModel');
    await this.settings.load();
  }

  async model() {
    this.logger.info('app.model');
    // Optionally fetch settings here
    return {};
  }
}

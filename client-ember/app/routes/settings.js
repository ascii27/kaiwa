import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SettingsRoute extends Route {
  @service api;
  @service logger;
  @service settings;

  async model() {
    this.logger.info('route.enter', { route: 'settings' });
    await this.settings.load();
    return {};
  }
}

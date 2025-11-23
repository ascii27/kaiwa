import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AdminRoute extends Route {
  @service logger;
  activate() {
    this.logger.info('route.enter', { route: 'admin' });
  }
}


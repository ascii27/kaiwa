import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class ApplicationController extends Controller {
  @service router;
  @service session;
  @tracked sidebarCollapsed = false;

  constructor() {
    super(...arguments);
    const saved = localStorage.getItem("kaiwa_sidebar_collapsed");
    this.sidebarCollapsed = saved === "true";
  }

  get currentRouteName() {
    return this.router?.currentRouteName;
  }

  @action toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem("kaiwa_sidebar_collapsed", String(this.sidebarCollapsed));
    // eslint-disable-next-line no-console
    console.log("[ui] toggle sidebar", { collapsed: this.sidebarCollapsed });
  }

  @action logout() {
    this.session.logout();
    this.router.transitionTo("auth");
  }
}

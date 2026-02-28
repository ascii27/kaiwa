import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class FlashService extends Service {
  @tracked message = null;
  _timer = null;

  show(msg) {
    if (this._timer) clearTimeout(this._timer);
    this.message = msg;
    this._timer = setTimeout(() => {
      this.message = null;
      this._timer = null;
    }, 3000);
  }

  willDestroy() {
    super.willDestroy();
    if (this._timer) clearTimeout(this._timer);
  }
}

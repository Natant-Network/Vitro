"use strict";

const eventBus = {
  list: new Map(),
  on(eventType, eventAction) {
    this.list.has(eventType) || this.list.set(eventType, []);
    if (this.list.get(eventType)) this.list.get(eventType).push(eventAction);
    return this;
  },
  emit(eventType, ...args) {
    this.list.get(eventType) && this.list.get(eventType).forEach(cb => {
      cb(...args);
    });
  }
};
const vm = new Vue({
  el: '#app',
  data() {
    return {
      solutions: false,
      more: false,
      menu: false
    };
  }
});
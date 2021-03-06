"use strict";

var fs            = require('fs'),
    EventEmitter  = require('events').EventEmitter,
    utils         = require('lodash');

/**
 * Decorator for dgraph which watches modules for changes and emits an 'update'
 * event.
 *
 * Possible options are:
 * - delay - delay before firing an event, allows I/O to calm down
 * - watchAll - allow watching for modules in node_modules
 */
function GraphLive(graph, opts) {
  this.graph = graph;
  this.opts = opts || {};
  this.watching = {};

  this.update = utils.debounce(
    this.update,
    this.opts.delay || 100,
    {maxWait: 1000});

  this.graph.on('module', function(mod) {
    if (!this.watching[mod.id] && this.needWatcher(mod.id))
      this.watchModule(mod.id);
  }.bind(this));
}

GraphLive.prototype = {

  needWatcher: function(id) {
    return (this.opts.watchAll || !this.opts.watchAll &&
      !id.match(/node_modules/));
  },

  close: function() {
    for (var id in this.watching) {
      this.watching[id].close();
      this.watching[id] = undefined;
    }
  },

  update: function(id, detected) {
    this.watchModule(id);
    this.emit('update', id, detected);
  },

  watchModule: function(id) {
    this.watching[id] = fs.watch(id, function() {
      this.watching[id].close();
      this.watching[id] = undefined;
      this.graph.invalidateModule(id);
      this.update(id, Date.now());
    }.bind(this));
  },

  toPromise: function() {
    return this.graph.toPromise();
  },

  toStream: function() {
    return this.graph.toStream();
  }
};

utils.assign(GraphLive.prototype, EventEmitter.prototype);

module.exports = function(graph, opts) {
  return new GraphLive(graph, opts);
}

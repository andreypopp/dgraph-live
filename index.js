"use strict";

var fs            = require('fs'),
    EventEmitter  = require('events').EventEmitter,
    through       = require('through'),
    utils         = require('lodash');

function GraphLive(graph, opts) {
  this.graph = graph;
  this.opts = opts || {};
  this.watching = {};
  this.update = utils.debounce(
    this.update,
    this.opts.delay || 100,
    {maxWait: 1000});
}

GraphLive.prototype = {

  close: function() {
    for (var id in this.watching) {
      this.watching[id].close();
      this.watching[id] = undefined;
    }
  },

  update: function(id, detected) {
    this.emit('update', id, detected);
    this.watchModule(id);
  },

  watchModule: function(id) {
    this.watching[id] = fs.watch(id, function() {
      this.graph.invalidateModule(id);
      this.watching[id].close();
      this.watching[id] = undefined;
      this.update(id, Date.now());
    }.bind(this));
  },

  toStream: function() {
    var interceptor = through(function(mod) {
      if (!this.watching[mod.id])
        this.watchModule(mod.id);
      interceptor.queue(mod);
    }.bind(this));

    return this.graph.toStream()
      .on('error', function(err) { interceptor.emit('error', err); })
      .pipe(interceptor);
  }
};

utils.assign(GraphLive.prototype, EventEmitter.prototype);

module.exports = function(graph, opts) {
  return new GraphLive(graph, opts);
}

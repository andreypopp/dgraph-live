"use strict";

var fs            = require('fs'),
    EventEmitter  = require('events').EventEmitter,
    through       = require('through'),
    utils         = require('lodash'),
    DGraph        = require('dgraph').Graph;

function GraphLive(mains, opts) {
  this.mains = mains;
  this.opts = opts || {};
  this.watching = {};
  this.cache = opts.cache = {};
  this.update = utils.debounce(
    this.update,
    this.opts.delay || 200,
    {maxWait: 1000});
}

GraphLive.prototype = {

  /**
   * Emit 'update' event and re-setup watching for module which triggered
   * update. The execution of this function is debounced to be executed only
   * once after some timeout during that editor or disk I/O could calm down.
   *
   * @param {Date} detected Timestamp of when update was exactly triggered
   * @param {String} id ID of the module which triggered an update
   */
  update: function(detected, id) {
    this.emit('update', detected, id);
    this.watchModule(id);
  },

  /**
   * Start watching a module by its id
   *
   * @param {String} id ID of a module to start watching
   */
  watchModule: function(id) {
    this.watching[id] = fs.watch(id, function() {
      this.cache[id].source = undefined;
      this.watching[id].close();
      this.watching[id] = undefined;
      this.update(Date.now(), id);
    }.bind(this));
  },

  /**
   * Produce a stream of dependencies.
   * This function mimics API of dgraph.Graph.
   */
  toStream: function() {
    var interceptor = through(function(mod) {
      if (this.watching[mod.id]) return;
      this.cache[mod.id] = mod;
      this.watchModule(mod.id);
      interceptor.queue(mod);
    }.bind(this));

    return new DGraph(this.mains, this.opts).toStream()
      .on('error', function(err) { interceptor.emit('error', err); })
      .pipe(interceptor);
  }
};

utils.assign(GraphLive.prototype, EventEmitter.prototype);

module.exports = GraphLive;

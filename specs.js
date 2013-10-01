var dgraphLive  = require('./index'),
    DGraph      = require('dgraph').Graph,
    assert      = require('assert'),
    path        = require('path'),
    touch       = require('touch'),
    aggregate   = require('stream-aggregate-promise');

function fixture(filename) {
  return path.resolve(path.join(__dirname, 'fixtures', filename));
}

function bundle(graph) {
  return aggregate(graph.toStream());
}

describe('dgraph-live', function() {

  it('watches for changes in graph and emits "update" event', function(done) {
    var graph = dgraphLive(new DGraph(fixture('foo.js')));
    bundle(graph).then(function(mods) {
      assert.equal(mods.length, 3);
      assert.equal(Object.keys(graph.watching).length, 3);
      touch(fixture('bar.js'));
    }).fail(done);

    graph.on('update', function(id, when) {
      assert.equal(id, fixture('bar.js'));
      bundle(graph).then(function(mods) {
        graph.close();
        assert.equal(mods.length, 3);
        done();
      }).fail(done);
    });
  });

  it('watches for changes in entry and emits "update" event', function(done) {
    var graph = dgraphLive(new DGraph(fixture('foo.js')));
    bundle(graph).then(function(mods) {
      assert.equal(mods.length, 3);
      assert.equal(Object.keys(graph.watching).length, 3);
      touch(fixture('foo.js'));
    }).fail(done);

    graph.on('update', function(id, when) {
      assert.equal(id, fixture('foo.js'));
      bundle(graph).then(function(bundle) {
        graph.close();
        assert.equal(bundle.length, 3);
        done();
      }).fail(done);
    });
  });

});

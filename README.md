# dgraph-live

This module exports `GraphLive` object which behaves exactly like `dgraph.Graph`
but starts watching for changes in modules' sources and emits an `'update'`
event if some changes were spotted.

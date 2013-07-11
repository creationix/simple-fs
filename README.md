simple-fs
======

A node.js implementation of the simple-stream and continuable based fs interface for js-git.

## File System Interface

This module implements the following functions from the fs interface which is described in detail at <https://github.com/creationix/js-git/blob/master/specs/fs.md>

- stat(path) -> continuable<stat>
- read(path, [encoding]) -> continuable<value>
- write(path, value, [encoding]) -> continuable
- readStream(path, [options]) -> continuable<stream>
- writeStream(path, [options]) -> continuable<sink>
- unlink(path) -> continuable
- readlink(path) -> continuable<target>
- symlink(path, target) -> continuable
- readdir(path) -> continuable<stream>
- rmdir(path) -> continuable
- mkdir(path) -> continuable
- rename(path, target) -> continuable

```js
var fs = require('simple-fs');

// Streaming copy a file callback style
function copy(source, dest, callback) {
  var stream;
  // Set up a readStream.
  fs.readStream("input.txt", onReadStream);

  function onReadStream(err, result) {
    if (err) return callback(err);
    stream = result;
    // Set up a writable sink
    fs.writeStream("copy.txt", onWriteStream);
  }

  function onWriteStream(err, sink) {
    if (err) return callback(err);
    // Stream from source to sink
    sink(stream, callback);
  }
}

copy("input.txt", "copy.txt", function (err) {
  if (err) throw err;
  console.log("Done Streaming");
});
```

You don't have to store all the steps into variables, so you can simply chain the calls.

Also if you're in an ES6 generator using [gen-run](https://github.com/creationix/gen-run), then consuming the continuable is even easier.

```js
var run = require('gen-run');
var fs = require('simple-fs');

function* copy(source, dest) {
  // Set up a readStream.
  var stream = yield fs.readStream(source);
  // Set up a writable sink
  var sink = yield fs.writeStream(dest);
  // Stream from source to sink
  yield sink(stream);
}

run(function* () {
  yield* copy("input.txt", "copy.txt");
  console.log("Done Streaming");
});
```


## chroot(root) -> fs

In addition to the exports object implementing the fs interface with respect to the filesystem root, you can also create a fs instance that is chrooted to some directory.

```js
var fs = require('simple-fs')("/home/tim/Code/js-git/.git");

// read the first chunk in the staging area's index.
fs.readStream("/index", function (err, stream) {
  if (err) throw err;
  stream.read(console.log);
});
```

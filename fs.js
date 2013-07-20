// This module implements the js-git fs interface for node.js
// The interface is documented at:
//
//   https://github.com/creationix/js-git/blob/master/specs/fs.md
//

var fs = require('fs');
var pathJoin = require('path').join;
var pathResolve = require('path').resolve;

module.exports = exports = chroot;
exports.stat = stat;
exports.read = read;
exports.write = write;
exports.readStream = readStream;
exports.writeStream = writeStream;
exports.unlink = unlink;
exports.readlink = readlink;
exports.symlink = symlink;
exports.readdir = readdir;
exports.rmdir = rmdir;
exports.mkdir = mkdir;
exports.rename = rename;

function chroot(root) {
  root = pathResolve(process.cwd(), root);
  var exports = wrap(chroot);
  exports.root = root;
  exports.stat = wrap(stat);
  exports.read = wrap(read);
  exports.write = wrap(write);
  exports.readStream = wrap(readStream);
  exports.writeStream = wrap(writeStream);
  exports.unlink = wrap(unlink);
  exports.readlink = wrap(readlink);
  exports.symlink = wrap(symlink);
  exports.readdir = wrap(readdir);
  exports.rmdir = wrap(rmdir);
  exports.mkdir = wrap(mkdir);
  exports.rename = wrap(rename, true);
  return exports;

  function wrap(fn, two) {
    return function () {
      arguments[0] = pathJoin(root, pathJoin("/", arguments[0]));
      if (two) arguments[1] = pathJoin(root, pathJoin("/", arguments[1]));
      return fn.apply(this, arguments);
    };
  }
}

// Given a path, return a continuable for the stat object.
function stat(path, callback) {
  if (!callback) return stat.bind(this, path);
  fs.stat(path, function (err, stat) {
    if (err) return callback(err);
    var ctime = stat.ctime / 1000;
    var cseconds = Math.floor(ctime);
    var mtime = stat.mtime / 1000;
    var mseconds = Math.floor(mtime);
    callback(null, {
      ctime: [cseconds, Math.floor((ctime - cseconds) * 1000000000)],
      mtime: [mseconds, Math.floor((mtime - mseconds) * 1000000000)],
      dev: stat.dev,
      ino: stat.ino,
      mode: stat.mode,
      uid: stat.uid,
      gid: stat.gid,
      size: stat.size
    });
  });
}

function read(path, encoding, callback) {
  if (!callback) return read.bind(this, path, encoding);
  fs.readFile(path, encoding, callback);
}

function write(path, value, encoding, callback) {
  if (!callback) return write.bind(this, path, value, encoding);
  fs.writeFile(path, value, encoding, callback);
}

// Given a path and options return a stream source of the file.
// options.start the start offset in bytes
// options.end the offset of the last byte to read
// readStream(path, options) -> continuable<stream>
function readStream(path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (!callback) return readStream.bind(this, path, options);
  options = options || {};
  var position = options.start;
  var fd, emit;
  var length = 8192;

  fs.open(path, "r", function (err, result) {
    if (err) return callback(err);
    fd = result;
    callback(null, { read: fileRead, abort: fileAbort });
  });
  
  function fileRead(callback) {
    if (!fd) return callback();
    if (emit) return callback(new Error("Only one read at a time"));
    emit = callback;
    var buffer = new Buffer(length);

    if (typeof position === 'number' && typeof options.end === 'number') {
      length = Math.min(length, options.end - position);
      if (!length) return fileClose(null, callback);
    }

    fs.read(fd, buffer, 0, length, position, onRead);
  }
  
  function onRead(err, bytesRead, buffer) {
    if (err || !bytesRead) return fileClose(err, function (err) {
      var callback = emit;
      emit = null;
      callback(err);
    });
    var callback = emit;
    emit = null;
    if (typeof position === 'number') position += bytesRead;
    if (bytesRead < buffer.length) buffer = buffer.slice(0, bytesRead);
    callback(null, buffer);
  }
  
  function fileAbort(callback) {
    fileClose(null, callback);
  }
  
  function fileClose(err, callback) {
    if (!fd) return callback(err);
    fs.close(fd, function (err2) {
      callback(err || err2);
    });
    fd = null;
  }
}

function writeStream(path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (!callback) return writeStream.bind(this, path, options);
  options = options || {};
  var fd, stream, onDone, done = false;
  
  fs.open(path, "w", options.mode, onOpen);
  
  function onOpen(err, result) {
    if (err) return callback(err);
    fd = result;
    callback(null, fileSink);
  }
  
  function fileSink(source, callback) {
    if (!callback) return fileSink.bind(this, source);
    stream = source;
    onDone = callback;
    stream.read(onRead);
  }
  
  function onRead(err, item) {
    if (item === undefined) return fileClose(err);
    fs.write(fd, item, 0, item.length, null, onWrite);
  }
  
  function onWrite(err, bytesWritten, buffer) {
    if (err) return fileClose(err);
    if (bytesWritten < buffer.length) {
      var slice = buffer.slice(bytesWritten);
      return fs.write(fd, slice, 0, slice.length, null, onWrite);
    }
    stream.read(onRead);
  }
  
  function fileClose(err) {
    if (!fd) onClose(err);
    fs.close(fd, onClose);
    fd = null;
  }
  
  function onClose(err) {
    if (done) return;
    done = true;
    onDone(err);
  }
}

function unlink(path, callback) {
  if (!callback) return unlink.bind(this, path);
  fs.unlink(path, callback);
}

function readlink(path, callback) {
  if (!callback) return readlink.bind(this, path);
  fs.readlink(path, callback);
}

function symlink(path, value, callback) {
  if (!callback) return symlink.bind(this, path, value);
  fs.symlink(path, value, callback);
}

function readdir(path, callback) {
  if (!callback) return readdir.bind(this, path);
  var files;
  fs.readdir(path, function (err, result) {
    if (err) return callback(err);
    files = result;
    callback(null, { read: dirRead, abort: dirAbort });
  });
  
  function dirRead(callback) {
    callback(null, files.shift());
  }
  
  function dirAbort(callback) {
    files.length = 0;
    callback();
  }
}

function rmdir(path, callback) {
  if (!callback) return rmdir.bind(this, path);
  fs.rmdir(path, callback);
}

function mkdir(path, callback) {
  if (!callback) return mkdir.bind(this, path);
  fs.mkdir(path, callback);
}

function rename(source, target, callback) {
  if (!callback) return rename.bind(this, source, target);
  fs.rename(source, target, callback);
}

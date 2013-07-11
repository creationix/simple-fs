var fs = require('../.');

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

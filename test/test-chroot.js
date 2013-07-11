var fs = require('../.')("/home/tim/Code/js-git/.git");

// read the first chunk in the staging area's index.
fs.readStream("/index", function (err, stream) {
  if (err) throw err;
  stream.read(console.log);
});

var run = require('gen-run');
var fs = require('../.');

function* copy(source, dest) {
  var stream = yield fs.readStream(source);
  var sink = yield fs.writeStream(dest);
  yield sink(stream);
}

run(function* () {
  yield* copy("input.txt", "copy.txt");
});

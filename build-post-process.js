const fs = require("fs");
const cwd = require('path').resolve();

fs.copyFileSync(cwd + '/dist/audio-processor.js',
                cwd + '/ipyaudioworklet/labextension/static/audio-processor.js');

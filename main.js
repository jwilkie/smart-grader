let argv = require('minimist')(process.argv.slice(2));
let config = require('./config');

exports.correctionPath = argv['_'][0];

config.load(argv['_'][0]);
if(config.isLoaded()){
    config.loadCorrectors(argv['_'][0]);
}

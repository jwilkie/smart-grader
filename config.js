let fs = require('fs');
let main = require('./main')
let correctionModules = {};

(() => {
    let correctionModulesPath = './correctionModules/';
    let correctionModuleFiles = fs.readdirSync(correctionModulesPath);
    for(let correctionModuleFile of correctionModuleFiles){
        let correctionModule = require(correctionModulesPath + correctionModuleFile);
        correctionModules[correctionModule.fileType] = correctionModule;
    }
})();

let config;

/**
 * Load the configuration file.
 */
exports.load = function(){
    if(!fs.existsSync(main.correctionPath)){
        console.error('ERROR: The specified directory does not exists.');
        return;
    }

    if(!fs.existsSync(main.correctionPath + 'config.json')){
        console.error('ERROR: The specified directory does not contains a file "config.json".');
        return;
    }

    let fileText = fs.readFileSync(main.correctionPath + 'config.json', 'utf-8');
    config = JSON.parse(fileText);
};

exports.loadCorrectors = function(){
    let allFiles = fs.readdirSync(main.correctionPath);

    for(let corrector of config){
        let filesToLoad = [];

        if(!corrector.files || corrector.files.length == 0){
            corrector.files = allFiles;
        }

        for(let file of corrector.files){
            // If the file is marked to be ignore, we ignore it
            if(corrector.ignore && corrector.ignore.includes(file)){
                continue;
            }

            if(file.toLowerCase().endsWith(corrector.type)){
                let fileText = fs.readFileSync(main.correctionPath + file, 'utf-8');
                filesToLoad.push(fileText);
            }
        }

        correctionModules[corrector.type].initialize(corrector.data)
        correctionModules[corrector.type].loadFiles(filesToLoad);
        correctionModules[corrector.type].runValidators(corrector.validations);
    }
};

/**
 * Indicates whether the configuration is loaded or not.
 * @returns {boolean} A value indicating whether the configuration is loaded or not.
 */
exports.isLoaded = function(){
    return !!config;
};

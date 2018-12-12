let mysql = require('promise-mysql');
let deepEqual = require('deep-equal');
let fs = require('fs');
let main = require('../main')

let connectionData;
let resetScript;
let removeUse = false;
let queries = [];
let validators = {};

exports.fileType = 'sql';

exports.initialize = function(configData){
    connectionData = {
        host: configData.host,
        port: configData.port,
        user: configData.user,
        password: configData.password,
        database: configData.database,
        multipleStatements: true
    };

    if(configData.resetScript){
        if(!fs.existsSync(main.correctionPath + configData.resetScript)){
            console.error('ERROR: The specified reset script does not exists.');
        }
        else{
            resetScript = fs.readFileSync(main.correctionPath + configData.resetScript, 'utf-8');
        }
    }

    removeUse = configData.removeUse || false;
};

/**
 * @param {Array.String} files - An array containing the files to correct
 */
exports.loadFiles = function(files){
    for(let file of files){
        let strippedFile = file;

        // Remove comments from file
        strippedFile = strippedFile.replace(/"/gm, '\'');
        strippedFile = replaceNotInString(strippedFile, '#.*$', '');
        strippedFile = replaceNotInString(strippedFile, '\\-\\-.*$', '');
        strippedFile = replaceNotInString(strippedFile, '\\/\\*(.|\\r|\\n)*?\\*\\/', '');

        // Remove USE commands
        if(removeUse){
            strippedFile = strippedFile.replace(/USE.*;/gm, '');
        }

        // Seperate each query
        let queriesInFile = splitOnChangingDelimiter(strippedFile);

        // Trim and remove empty query
        for(let i = 0 ; i < queriesInFile.length ; i++){
            queriesInFile[i] = queriesInFile[i].trim();
            if(!queriesInFile[i]){
                queriesInFile.splice(i, 1);
                i--;
            }
        }

        // Add all queries to the query array
        queries = queries.concat(queriesInFile);
        // console.log(queries);
    }
};

exports.runValidators = async function(validations){
    let nbInvalid = 0;
    for(let validation of validations){
        let valid = await validators[validation.type].function(validation)
        if(!valid){
            nbInvalid++;
            console.log(`[VALIDATION FAILED] (${validation.type})`)
            console.log(validators[validation.type].message(validation));
        }
    }

    console.log(`[${validations.length - nbInvalid} / ${validations.length} VALIDATION PASSED]`);
};

validators['number_queries'] = {
    function: function(config){
        if(config.compare == '>'){
            return queries.length > config.number
        }
        else if(config.compare == '<'){
            return queries.length < config.number
        }
        else{
            return queries.length == config.number
        }
    }, 
    message: function(config){
        let comparison = '';
        if(config.compare == '>'){
            comparison = 'more than';
        }
        else if(config.compare == '<'){
            comparison = 'less than';
        }

        return `The number of queries is invalid. You have ${queries.length} queries, ` +
               `but you should have ${comparison} ${config.number}.`;
    }
};

validators['query_result_match'] = {
    function: async function(config){
        let connection;

        // Create connection
        try{
            connection = await mysql.createConnection(connectionData);
        }
        catch(error){
            console.log(error);
            return false;
        }

        // Send queries
        try{
            let queriesToComare = [];

            queriesToComare.push(connection.query(queries[config.index]));
            queriesToComare.push(connection.query(config.match));
            let result = await Promise.all(queriesToComare);
            connection.end();

            if(config.level === 'row_count'){
                return result[0].length === result[1].length;
            }
            else if(config.level === 'row_contains'){
                return arrayObjectCompare(result[0], result[1], objectContains);
            }
            else if(config.level === 'row_contains_ordered'){
                return arrayObjectContainsInOrder(result[0], result[1]);
            }
            else if(config.level === 'row_equal'){
                return arrayObjectCompare(result[0], result[1], deepEqual);
            }
            else if(config.level === 'row_equal_ordered'){
                return deepEqual(result[0], result[1]);
            }
        }
        catch(error){
            // console.log(error);
            connection.end();
            return false;
        }
    }, 
    message: function(config){
        return `The result of the query at the index ${config.index + 1} is not the ` +
               `same as the expected result.`;
    }
};

validators['execute_and_check'] = {
    function: async function(config){
        // Create connection
        try{
            connection = await mysql.createConnection(connectionData);
        }
        catch(error){
            console.log(error);
            return false;
        }

        // Send queries and validate
        try {
            // Reset database if needed
            if(config.reset){
                await connection.query(resetScript);
            }

            for(let index of config.indexes){
                await connection.query(queries[index]);
            }
            
            for(let check of config.checks){
                let result = await connection.query(check.query);

                if(!check.expected){
                    continue;
                }

                if(!arrayObjectCompare(check.expected, result, deepEqual)){
                    connection.end();
                    return false;
                }
            }

            connection.end();
            return true;
        }
        catch(error){
            console.log({ message: error.sqlMessage, code: error.sqlState, sql: error.sql });
            connection.end();
            return false;
        }
    },
    message: function(config){
        return `The result of the check for the query ${indexesToReadableString(config.indexes)} is not ` + 
               `the is not the same as the expected result`;
    }
}

let replaceNotInString = function(text, regexString, replaceText){
    let regex = new RegExp(`\\\\'|'(?:\\\\'|[^'])*'|(${regexString})`, 'gm');
    return text.replace(regex, function(match, group0) {
        if (!group0){
            return match;
        }
        else {
            return replaceText;
        }
    });
};

let splitOnChangingDelimiter = function(text){
    let defaultSplitter = ';';
    let currentSplitter = defaultSplitter;
    // let currentReadIndex = 0;
    let currentIndex = 0;
    let textLower = text.toLowerCase();
    let array = [];

    do {
        let indexSplitter = textLower.indexOf(currentSplitter, currentIndex);
        let indexDelimiter = textLower.indexOf('delimiter ', currentIndex);

        if(indexSplitter < 0){
            array.push(text.substring(currentIndex));
            currentIndex = text.length;
            // currentReadIndex = text.length;
            currentSplitter = defaultSplitter;
        }
        else if(indexDelimiter < 0 || indexSplitter < indexDelimiter){
            array.push(text.substring(currentIndex, indexSplitter));
            currentIndex = indexSplitter + currentSplitter.length;
            // currentReadIndex = indexSplitter + currentSplitter.length;
            currentSplitter = defaultSplitter;
        }
        else{
            let indexEndDelimiter = textLower.indexOf('\n', indexDelimiter + 1) + 1
            currentSplitter = text.substring(indexDelimiter, indexEndDelimiter).substring(10).trim();
            currentIndex = indexEndDelimiter;
        }
    } while(currentIndex < text.length);

    return array;
};

let objectContains = function(object, otherObject){
    for(let property in otherObject){
        if(!otherObject.hasOwnProperty(property)){
            continue;
        }

        if(object[property] === null || 
           object[property] === undefined || 
           object[property] !== otherObject[property]){
            return false;
        }
    }

    return true;
}

let arrayObjectContainsInOrder = function(array, otherArray){
    if(array.length != otherArray.length){
        return false;
    }
    
    for(let i = 0 ; i < array.length ; i++){
        if(!objectContains(array[i], otherArray[i])){
            return false;
        }
    }

    return true;
}

let arrayObjectCompare = function(array, otherArray, comparison){
    if(array.length != otherArray.length){
        return false;
    }

    let isFound = false;
    for(let i = 0 ; i < otherArray.length ; i++){
        isFound = false;
        for(let j = 0 ; j < array.length ; j++){
            if(comparison(array[j], otherArray[i])){
                isFound = true;
                array.splice(j, 1);
                break;
            }
        }

        if(!isFound){
            return false;
        }
    }

    return array.length === 0;
}

let indexesToReadableString = function(array){
    let string = '';
    for(let i = 0 ; i < array.length ; i++){
        string += array[i] + 1;
        if(i != array.length - 1){
            string += ', ';
        }
    }

    return string;
};

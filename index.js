const shell = require('shelljs');
const fs = require('fs');

let profile = 'YOUR_AWS_PROFILE';   // put your aws profile here
let fetchFunction = `aws lambda list-functions --profile ${profile}`;   // fetch lambdas command
let fetchLog = `aws logs describe-log-streams --log-group-name /aws/lambda/? --profile ${profile}`; // fetch logs command

// function to fetch lambda functions
let fetchFunctions = () => {
    let functions = []; // create an array of objects
    return new Promise((resolve, reject) => {
        
        let { stdout, stderr, code } = shell.exec(fetchFunction, { silent: true });
        let jsonValue = JSON.parse(stdout);

        for(let index in jsonValue['Functions']) {
            let d = new Date(jsonValue['Functions'][index]['LastModified']);
            let lastModified = `${d.getDate()} ${d.toLocaleString('en-us', { month: 'long' })} ${d.getFullYear()}`;
            
            functions.push({
                functionName : jsonValue['Functions'][index]['FunctionName'],
                runtime : jsonValue['Functions'][index]['Runtime'],
                description : jsonValue['Functions'][index]['Description'],
                lastModified : lastModified,
                lastExecution : ''
            });

        }
        resolve(functions);
    });
};

// fetch the last execution of all the lambdas
let fetchLastExecutions = async (functions) => {
    for(let index in functions) {
        await fetchLastExecution(functions, index);
    }
    return Promise.resolve();
};

// fetch last execution of single lambda
let fetchLastExecution = (functions, index) => {
    return new Promise((resolve, reject) => {

        let { stdout, stderr, code } = shell.exec(fetchLog.replace('?', functions[index].functionName), { silent: true });
        
        try {

            let jsonValue = JSON.parse(stdout);
            let lastExecutionTime = jsonValue['logStreams'][jsonValue['logStreams'].length -1]['lastEventTimestamp'];
            
            let d = new Date(lastExecutionTime);
            let value = `${d.getDate()} ${d.toLocaleString('en-us', { month: 'long' })} ${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
            functions[index].lastExecution = value;
        
        }
        catch(err) {
            console.log(err);
        }

        resolve();
    });
};

// write as csv file
let writeFile = (outputTxt) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(`${profile}_lambda.csv`, outputTxt, () => {
            resolve();
        });
    });
};

// main function
let main = async () => {

    // fetch the functions
    let functions = await fetchFunctions();

    // fetch the last executions
    await fetchLastExecutions(functions);

    // create output in csv format
    let outputTxt = 'Function Name, Runtime, Description, Last Modified, Last Execution\n';
    for(let index in functions) {
        outputTxt += `"${functions[index].functionName}","${functions[index].runtime}","${functions[index].description}","${functions[index].lastModified}","${functions[index].lastExecution}"\n`;
    }

    // write file
    await writeFile(outputTxt);

};


// execute main
main();

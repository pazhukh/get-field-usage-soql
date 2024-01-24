#!/usr/bin/env node
const yargs = require('yargs/yargs');
const fs = require('fs');
const { hideBin } = require('yargs/helpers');
let metadataSupport = ['report', 'dashboard'];

yargs(hideBin(process.argv))
  .command(
      'find',
      `Search field usage in: ${metadataSupport.join(', ')}`,
      async ({ argv }) => {
        try {
          let { path, metadata, object, field, strict } = argv;
  
          let files = getFiles(path, metadata);
  
          let filesNameWhereFieldIsUsed = files.reduce((total, r) => {
            let fileContent = fs.readFileSync(r.path, 'utf-8');

            let usedInFilter = fileContent.includes(`<column>${object}.${field}</column>`);
            let usedInGrouping = fileContent.includes(`<groupingColumn>${object}.${field}</groupingColumn>`);

            if (fileContent.includes(field) && (!strict || usedInFilter || usedInGrouping)) {
                r.name = r.name.replace(`.${metadata}-meta.xml`, '');
                total.push(r.name);
            }
            return total;
          }, []);
  
          // if no files found we exit process
          if (!filesNameWhereFieldIsUsed.length) {
            console.error(`"${field}" is not used in any ${metadata}s [strict=${strict}]`);
            process.exit(1);
          }
  
          // create part of WHERE clause
          let filesNamesForSoql = filesNameWhereFieldIsUsed.reduce((total, fileName) => {
            total += `'${fileName}',`;
            return total;
          }, '(');
          filesNamesForSoql = filesNamesForSoql.slice(0, -1);
          filesNamesForSoql+=')';
  
          let soql = generateSoql(filesNamesForSoql, metadata);
          console.log(soql);
          console.log(`\n${metadata}s found: ${filesNameWhereFieldIsUsed.length}`);
        } catch (e) {
          console.log('error', e);
        }
      }
  )
  .option('p', {
    alias: 'path',
    demandOption: true,
    describe: 'Absolute path to Salesforce project',
    type: 'string'
  })
  .option('m', {
    alias: 'metadata',
    demandOption: true,
    choices: metadataSupport,
    describe: 'Metadata type'
  })
  .option('o', {
    alias: 'object',
    demandOption: true,
    describe: 'Object API Name',
    type: 'string'
  })
  .option('f', {
    alias: 'field',
    demandOption: true,
    describe: 'Field API Name',
    type: 'string'
  })
  .option('s', {
    alias: 'strict',
    describe: 'Get only reports/dashboards where field is used in filters/grouping/formulas',
    type: 'boolean'
  })
  .parse()


function getFiles(directory, metadata) {
  let files = [];

  function _getFiles(directory, metadata) {
    validPath(directory);

    fs.readdirSync(directory).forEach(file => {
      const absolute = `${directory}/${file}`;

      validPath(absolute);

      if (fs.statSync(absolute).isDirectory()) {
          return _getFiles(absolute, metadata);
      } else if (absolute.endsWith(`.${metadata}-meta.xml`)) {
          return files.push({
              name: file,
              path: absolute
          });
      }
    });
  }

  _getFiles(directory, metadata);

  return files;
}

function validPath(path) {
  if (!fs.existsSync(path)) {
    console.error(`"${path}" not a valid path`);
    process.exit(1);
  }
}

function generateSoql(filesNamesForSoql, metadata) {
  let soql = '';
  if (metadata === 'report') {
    soql = 
    'SELECT Id, DeveloperName, LastRunDate FROM Report WHERE DeveloperName IN \n' +
    filesNamesForSoql +
    '\nORDER BY LastRunDate DESC';

  } else if (metadata === 'dashboard') {
    soql = 
    'SELECT Id, DeveloperName, LastViewedDate FROM Dashboard WHERE DeveloperName IN \n\n' +
    filesNamesForSoql +
    '\n\nORDER BY LastViewedDate DESC';
  }

  if (!soql) {
    console.error(`${metadata} is not supported`);
    process.exit(1);
  }

  return soql;
}


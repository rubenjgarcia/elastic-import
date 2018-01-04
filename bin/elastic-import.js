#!/usr/bin/env node

'use strict'

const program = require('commander')
const Importer = require('../lib/importer')

const path = require('path')
const chalk = require('chalk')
const fs = require('fs')
const readline = require('readline')
const _ = require('lodash')
const parse = require('csv-parse')

const pkg = require(path.join(__dirname, '..', 'package.json'))

program
  .version(pkg.version)
  .arguments('<file> <host> <index> <type>')
  .option('-l, --log <level>', 'ElasticSearch log value. One of \'trace\', \'debug\', \'info\', \'warn\', \'error\'. Default is \'info\'', 'info')
  .option('-b, --bulk-size <size>', 'Records sent to the Elasticsearch server for each request. Default is 1000', 1000)
  .option('-i, --ignore <fields>', 'Comma separated fields that will be ignored. You can use \'field.sub\', \'field.sub[0].other\' or \'field.sub[*].other\'')
  .option('-w, --warn-errors', 'Warns on error instead of kill the process')
  .option('-t, --transform-file <file>', 'Path to a file that exports a function to transform the object')
  .option('-f, --fields <fields>', 'Comma separated name of the fields for CSV import')
  .option('-h, --header-fields', 'Try to use the first line to parse the name of the fields for CSV import')
  .option('-d, --delimiter <delimiter>', 'Field delimiter for CSV import. Defaults to comma. For tab use \'tab\'', ',')
  .option('-q, --quote <quote>', 'Character surrounding the fields for CSV import. Defaults to nothing', '')
  .option('-p, --csvParse', 'Parser will attempt to convert read data types to native types when using CSV import')
  .option('-T, --timeout <timeout>', 'Milliseconds before an Elastic request will be aborted and retried. Default is 30000', 30000)
  .option('--mongo', 'Imports from mongo-export file')
  .option('--json', 'Imports from json file')
  .option('--csv', 'Imports from csv file')
  .description('Imports a file from differents types')
  .parse(process.argv)

if (!program.args[ 0 ]) {
  program.help()
  process.exit(1)
}

if (!program.mongo && !program.json && !program.csv) {
  console.log(chalk.red('Elastic Import: You must provide an import type (mongo, csv or json'))
  process.exit(1)
}

const file = program.args[ 0 ]

if (!fs.existsSync(file)) {
  console.log(chalk.red('Elastic Import: The file \'' + file + '\' doesn\'t exist'))
  process.exit(1)
}

if (!program.args[ 1 ]) {
  console.log(chalk.red('Elastic Import: You must provide an ElasticSearch host. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

const host = program.args[ 1 ]

const logLevel = [ 'trace', 'debug', 'info', 'warn', 'error' ]
program.log = _.includes(logLevel, program.log) ? program.log : 'info'

const index = program.args[ 2 ]
const type = program.args[ 3 ]

if (!index) {
  console.log(chalk.red('Elastic Import: You must provide an index. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

if (!type) {
  console.log(chalk.red('Elastic Import: You must provide a type. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

let transform

if (program.transformFile) {
  if (!fs.existsSync(program.transformFile)) {
    console.log(chalk.red('Elastic Import: The file \'' + program.transformFile + '\' doesn\'t exist'))
    process.exit(1)
  }

  transform = require(path.relative(__dirname, program.transformFile))

  if (!_.isFunction(transform)) {
    console.log(chalk.red('Elastic Import: The transform file doesn\'t export a function'))
    process.exit(1)
  }
}

const importer = new Importer({
  host: host,
  index: index,
  type: type,
  requestTimeout: program.timeout,
  log: program.log,
  ignore: program.ignore,
  warnErrors: program.warnErrors,
  transform: transform
})

let data

if (program.mongo) {
  data = []

  readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'UTF-8' }),
    terminal: false
  }).on('line', function (line) {
    const json = JSON.parse(line)
    data.push(json)

    if (data.length >= program.bulkSize) {
      importer.import(data)
      data = []
    }
  }).on('close', function () {
    if (data.length > 0) {
      importer.import(data)
    }
  })
} else if (program.json || program.csv) {
  const importData = function () {
    if (!_.isArray(data) || data.length < program.bulkSize) {
      importer.import(data)
    } else {
      while (true) {
        if (data.length === 0) {
          break
        }

        const partial = data.splice(0, program.bulkSize)
        importer.import(partial)
        console.log('sent', partial.length)
      }
    }
  }

  if (program.json) {
    data = JSON.parse(fs.readFileSync(file))
    importData()
  } else {
    if (!program.fields && !program.headerFields) {
      console.log(chalk.red('Elastic Import: You must provide the fields from the CSV file or set the --header-fields option'))
      process.exit(1)
    }

    const parser = parse({
      delimiter: program.delimiter === 'tab' ? '\t' : program.delimiter,
      quote: program.quote,
      columns: program.fields ? program.fields.split(',') : true,
      skip_empty_lines: true,
      auto_parse: program.csvParse,
      auto_parse_date: program.csvParse
    }, function (err, lines) {
      if (err) {
        console.log(err)

        if (!program.warnErrors) {
          process.exit(1)
        }
      }

      data = lines
      importData()
    })

    fs.createReadStream(file).pipe(parser)
  }
}

#!/usr/bin/env node

'use strict'

var program = require('commander')

var path = require('path')
var chalk = require('chalk')
var fs = require('fs')
var readline = require('readline')
var _ = require('lodash')
var moment = require('moment')
var elasticsearch = require('elasticsearch')

var pkg = require(path.join(__dirname, '..', 'package.json'))

var file
var host

program
  .version(pkg.version)
  .arguments('<file> <host> <index> <type>')
  .option('-l, --log <level>', 'ElasticSearch log value. One of \'trace\', \'debug\', \'info\', \'warn\', \'error\'. Default is \'info\'', 'info')
  .option('-b, --bulk-size <size>', 'Records sent to the Elasticsearch server for each request. Default is 1000', 1000)
  .option('-g, --ignore <fields>', 'Comma separated fields that will be ignored. You can use \'field.sub\', \'field.sub[0].sub\' or \'field.sub[*].sub\'')
  .option('-w, --warn-errors', 'Warns on error instead of kill the process')
  .option('-f, --transform-file <file>', 'Path to a file that exports a function to transform the object')
  .description('Imports a file from mongoexport')
  .parse(process.argv)

if (!program.args[ 0 ]) {
  program.help()
  process.exit(1)
}

file = program.args[ 0 ]

if (!fs.existsSync(file)) {
  console.log(chalk.red('Elastic Import [mongoexport]: The file \'' + file + '\' doesn\'t exist'))
  process.exit(1)
}

if (!program.args[ 1 ]) {
  console.log(chalk.red('Elastic Import [mongoexport]: You must provide an ElasticSearch host. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

host = program.args[ 1 ]

var logLevel = [ 'trace', 'debug', 'info', 'warn', 'error' ]
program.log = _.includes(logLevel, program.log) ? program.log : 'info'

var index = program.args[ 2 ]
var type = program.args[ 3 ]

if (!index) {
  console.log(chalk.red('Elastic Import [mongoexport]: You must provide an index. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

if (!type) {
  console.log(chalk.red('Elastic Import [mongoexport]: You must provide a type. See \'elastic-import from-mongoexport --help\''))
  process.exit(1)
}

var transform

if (program.transformFile) {
  if (!fs.existsSync(program.transformFile)) {
    console.log(chalk.red('Elastic Import [mongoexport]: The file \'' + program.transformFile + '\' doesn\'t exist'))
    process.exit(1)
  }

  transform = require(path.relative(__dirname, program.transformFile))

  if (!_.isFunction(transform)) {
    console.log(chalk.red('Elastic Import [mongoexport]: The transform file doesn\'t export a function'))
    process.exit(1)
  }
}

var client = new elasticsearch.Client({
  host: host,
  log: program.log
})

var data = []
var indexData = function () {
  var partial = _.clone(data)
  data = []

  var body = []
  partial.map(function (record) {
    Object.keys(record).map(function (key) {
      if (_.isObject(record[ key ])) {
        if (record[ key ][ '$oid' ]) {
          record[ key ] = record[ key ][ '$oid' ]
        } else if (record[ key ][ '$date' ]) {
          record[ key ] = moment(record[ key ][ '$date' ]).toDate()
        }
      }
    })

    if (program.ignore) {
      program.ignore.split(',').map(function (ignore) {
        ignore = ignore.trim()
        if (ignore.indexOf('[*].') !== -1) {
          var field = ignore.substring(0, ignore.indexOf('[*]'))
          var obj = record[ field ]
          if (obj && _.isArray(obj)) {
            var afterField = ignore.substring(ignore.indexOf('[*].') + 4)
            obj.map(function (value) {
              _.unset(value, afterField)
            })
          }
        } else {
          _.unset(record, ignore)
        }
      })
    }

    if (program.transformFile) {
      record = transform(record) || record
    }

    body.push({ create: { _index: index, _type: type, _id: record._id } })
    delete record._id
    body.push(record)
  })

  client.bulk({ body: body }, function (err, resp) {
    if (err || resp.errors) {
      var color = program.warnErrors ? chalk.yellow : chalk.red
      console.log(color('Elastic Import [mongoexport]: Error importing data'))

      if (err) {
        console.log(err)
      } else {
        var errors = _.filter(resp.items, function (item) {
          return (item.index && item.index.error) || (item.create && item.create.error)
        })

        errors.map(function (item) {
          var message = item.index ? item.index.error : item.create.error
          console.log(color('Error: ' + message.type), color('-'),
            color('Reason: ' + message.reason),
            color('-'), color('Caused by: ' + message.caused_by.reason)
          )
        })
        console.log(color('Elastic Import [mongoexport]: Sent ' + partial.length + ' records (' + errors.length + ' errors)'))
      }

      if (!program.warnErrors) {
        process.exit(1)
      }
    } else {
      console.log(chalk.green('Elastic Import [mongoexport]: Sent ' + partial.length + ' records'))
    }
  })
}

readline.createInterface({
  input: fs.createReadStream(file, { encoding: 'UTF-8' }),
  terminal: false
}).on('line', function (line) {
  var json = JSON.parse(line)
  data.push(json)

  if (data.length >= program.bulkSize) {
    indexData()
  }
}).on('close', function () {
  if (data.length > 0) {
    indexData()
  }
})

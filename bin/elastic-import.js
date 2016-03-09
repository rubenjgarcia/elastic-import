#!/usr/bin/env node

'use strict'

var program = require('commander')
var path = require('path')
var pkg = require(path.join(__dirname, '..', 'package.json'))
var chalk = require('chalk')
var _ = require('lodash')

program
  .version(pkg.version)
  .command('from-mongoexport <file> <host>', 'Imports a file from mongoexport')
  .parse(process.argv)

if (program.args.length < 1) {
  program.help()
}

var commands = program.commands.map(function (command) {
  return command._name
})

if (!_.includes(commands, program.args[ 0 ])) {
  console.log(chalk.red('Elastic Import: \'' + program.rawArgs[ 2 ] + '\' is not a valid command. See \'elastic-import --help\''))
  process.exit(1)
}

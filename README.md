# elastic-import

A light tool to import data to [ElasticSearch](https://www.elastic.co/products/elasticsearch)

## Install

    npm install elastic-import

## Usage

You can see all the options using the command `elastic-import --help`

```
Usage: elastic-import [options] [command]


Commands:

  from-mongoexport <file> <host>  Imports a file from mongoexport
  help [cmd]                      display help for [cmd]

Options:

  -h, --help     output usage information
  -V, --version  output the version number

``` 

Or you can see help for specific command

`elastic-import from-mongoexport --help`

```
Usage: elastic-import-from-mongoexport [options] <file> <host> <index> <type>

Imports a file from mongoexport

Options:

  -h, --help                       output usage information
  -V, --version                    output the version number
  -l, --log <level>                ElasticSearch log value. One of 'trace', 'debug', 'info', 'warn', 'error'. Default is 'info'
  -b, --bulk-size <size>           Records sent to the Elasticsearch server for each request. Default is 1000
  -g, --ignore <fields>            Comma separated fields that will be ignored. You can use 'field.sub', 'field.sub[0].sub' or 'field.sub[*].sub'
  -w, --warn-errors                Warns on error instead of kill the process
  -f, --transform-file <file>      Path to a file that exports a function to transform the object

```

#### from-mongoexport transform functions

You can use a function to transform any record before submitting to ElasticSearch

Here's an example

```
'use strict'

module.exports = function (record) {
  record.myfield.toLowerCase()
}
```

The argument of the function is the original JSON object

You can return a new object instead the original object

```
'use strict'

module.exports = function (record) {
  return {
    newField : record.oldField
  }
}
```

### Examples

Import from a [mongoexport](https://docs.mongodb.org/manual/reference/program/mongoexport) JSON file

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 index type
     
Import from a mongoexport JSON file ignoring file _ignoreMe_ and all the _ignoreMe_ fields in the field myArray 

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 index type -g ignoreMe,myArray[*].ignoreMe
    
Import from a mongoexport JSON file using the function in the file _transform.js_ to transform the records

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 index type -f transform.js

## TODO

- Import from CSV
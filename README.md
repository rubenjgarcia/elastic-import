# elastic-import

A light tool to import data to [ElasticSearch](https://www.elastic.co/products/elasticsearch)

## Install

    npm install elastic-import

## Usage from CLI

You can see all the options using the command `elastic-import --help`

```
Usage: elastic-import [options] <file> <host> <index> <type>

  Imports a file from differents types

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -l, --log <level>            ElasticSearch log value. One of 'trace', 'debug', 'info', 'warn', 'error'. Default is 'info'
    -b, --bulk-size <size>       Records sent to the Elasticsearch server for each request. Default is 1000
    -i, --ignore <fields>        Comma separated fields that will be ignored. You can use 'field.sub', 'field.sub[0].other' or 'field.sub[*].other'
    -w, --warn-errors            Warns on error instead of kill the process
    -t, --transform-file <file>  Path to a file that exports a function to transform the object
    -f, --fields <fields>        Comma separated name of the fields for CSV import
    -h, --header-fields          Try to use the first line to parse the name of the fields for CSV import
    -d, --delimiter <delimiter>  Field delimiter for CSV import. Defaults to comma. For tab use 'tab'
    -q, --quote <quote>          Character surrounding the fields for CSV import. Defaults to nothing
    -p, --parse                  Parser will attempt to convert read data types to native types when using CSV import
    --mongo                      Imports from mongo-export file
    --json                       Imports from json file
    --csv                        Imports from csv file
```

#### Transform function

You can use a function to transform any record before submitting to ElasticSearch

Here's an example

```
'use strict'

module.exports = function (record) {
  record.myfield = record.myfield.toLowerCase()
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

    elastic-import ~/tmp/data.json localhost:9200 myindex mytype --mongo
     
Import from a JSON file ignoring file _ignoreMe_ and all the _ignoreMe_ fields in the field myArray

    elastic-import ~/tmp/data.json localhost:9200 myindex mytype -i ignoreMe,myArray[*].ignoreMe --json
    
Import from a CSV file using the function in the file _transform.js_ to transform the records

    elastic-import ~/tmp/data.csv localhost:9200 myindex mytype -t transform.js --csv -h -p

## Usage from another module

```
var Importer = require('elastic-import')
var importer = new Importer({
  host: 'localhost:9200',
  index: 'myindex',
  type: 'mytype',
  log: 'info',
  ignore: 'ignoreMe',
  warnErrors: false,
  transform: function (record) {
    record.text = record.text.toUpperCase()
  }
})

importer.import([{text: 'Hello world', ignoreMe: 'ignore'}])
```
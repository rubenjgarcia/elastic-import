# elastic-import

A light tool to import data to [ElasticSearch](https://www.elastic.co/products/elasticsearch)

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
Usage: elastic-import-from-mongoexport [options] <file> <host>

Imports a file from mongoexport

Options:

  -h, --help                       output usage information
  -V, --version                    output the version number
  -l, --log <level>                ElasticSearch log value. One of 'trace', 'debug', 'info', 'warn', 'error'. Default is 'info'
  -b, --bulk-size <size>           Records sent to the Elasticsearch server for each request. Default is 1000
  -i, --index <index>              ElasticSearch index
  -t, --type <type>                ElasticSearch index type
  -g, --ignore <fields>            Comma separated fields that will be ignored. You can use 'field.sub', 'field.sub[0].sub' or 'field.sub[*].sub'
  -w, --warn-errors                Warns on error instead of kill the process
  -f, --transform-file <file>      Path to a file that exports a function to transform the object fields
  -d, --transform-fields <fields>  Comma separated fields that will be pass through the transform function

```

#### from-mongoexport transform functions

You can use a function to transform any field before submitting to ElasticSearch

Here's an example

```
'use strict'

module.exports = function (orig, field, value) {
  return value.toLowerCase()
}
```

The arguments of the function are: 

- orig: Original JSON object
- field: Field name
- value: Original field value

### Examples

Import from a [mongoexport](https://docs.mongodb.org/manual/reference/program/mongoexport) JSON file

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 -i index -t type
     
Import from a mongoexport JSON file ignoring file _ignoreMe_ and all the _ignoreMe_ fields in the field myArray 

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 -i index -t type -g ignoreMe,myArray[*].ignoreMe
    
Import from a mongoexport JSON file using the function in the file _transform.js_ to transform the field _transformMe_ 

    elastic-import from-mongoexport ~/tmp/tweets.json localhost:9200 -i index -t type -f transform.js -d transformMe

## TODO

- Import from CSV
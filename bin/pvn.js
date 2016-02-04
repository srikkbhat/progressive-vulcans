#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2016 srikkbhat. All rights reserved.
 */
// jshint node:true
'use strict';
var ProgressiveVulcans = require('../pvn');
var cliArgs = require("command-line-args");

var cli = cliArgs([
  {
    name: "bowerdir",
    type: String,
    alias: "b",
    description: "Bower components directory. Defaults to 'app/bower_components/'",
    defaultValue: "app/bower_components/"
  },
  {
    name: "definition",
    type: String,
    alias: "f",
    description: "Yaml file with definition for progressive vulcanize. Defaults to 'pvn.yaml'",
    defaultValue: "pvn.yaml"
  },
  {
    name: "destdir",
    type: String,
    alias: "d",
    description: "Destination for vulcanized application. Defaults to 'dist/elements/'",
    defaultValue: "dist/elements/"
  },
  {
    name: "elementsdir",
    type: String,
    alias: "e",
    description: "Directory the elements to be vulcanized are stored. Defaults to 'app/elements/'",
    defaultValue: "app/elements/"
  },
  {
    name: "help",
    alias: "h",
    description: "Print usage."
  },
  {
    name: "root",
    type: String,
    alias: "r",
    description: (
      "Root directory against which URLs of endpoints and HTML imports are " +
      "resolved. If not specified, then the current working directory is used."
    ),
    defaultValue: process.cwd()
  },
  {
    name: "workdir",
    type: String,
    alias: "w",
    description: (
      "Temporary directory for holding in-process files. DANGER: " +
      " this directory will be deleted upon tool success. Defaults to '.pvn/'"
    ),
    defaultValue: ".pvn/"
  }
]);

var usage = cli.getUsage({
  header: "progressive-vulcans creates multiple vulcanized file with incremental dependency",
  title: "pvn"
});

var options = cli.parse();

if (options.help) {
  console.log(usage);
  process.exit(0);
}

var vulcans = new ProgressiveVulcans(options);
vulcans.build(options.definition).then(function(){
  console.log('Build success!');
}).catch(function(err){
  console.error(err.stack);
});

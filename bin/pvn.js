#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2016 srikkbhat. All rights reserved.
 */
// jshint node:true
'use strict';
var ProgressiveVulcans = require('../pvn');
var cliArgs = require("command-line-args");
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var cli = cliArgs([
  {
    name: "bowerdir",
    type: String,
    alias: "b",
    description: "Bower components directory. Defaults to 'bower_components'",
    defaultValue: "bower_components"
  },
  {
    name: "definition",
    type: String,
    alias: "f",
    defaultValue: "pvn.yaml",
    description: "Yaml file with definition for progressive vulcanize. Defaults to 'pvn.yaml'"
  },
  {
    name: "destdir",
    type: String,
    alias: "d",
    defaultValue: "dist/",
    description: "Destination for vulcanized application. Defaults to 'dist/'"
  },
  {
    name: "elementsdir",
    type: String,
    alias: "e",
    defaultValue: "app/elements/",
    description: "Directory the elements to be vulcanized are stored. Defaults to 'app/elements/'"
  },
  {
    name: "help",
    alias: "h",
    description: "Print usage."
  },
  {
    name: "root",
    type: String,
    defaultValue: process.cwd(),
    alias: "r",
    description: (
      "Root directory against which URLs of endpoints and HTML imports are " +
      "resolved. If not specified, then the current working directory is used."
    )
  },
  {
    name: "workdir",
    type: String,
    alias: "w",
    defaultValue: "tmp/",
    description: (
      "Temporary directory for holding in-process files. DANGER: " +
      " this directory will be deleted upon tool success. Defaults to 'tmp/'"
    )
  }
]);

var usage = cli.getUsage({
  header: "progressive-vulcans creates multiple vulcanized file with progressive dependency",
  title: "pvn"
});

var options = cli.parse();

if (options.help) {
  console.log(usage);
  process.exit(0);
}

// Make sure resolution has a path segment to drop.
// According to URL rules,
// resolving index.html relative to /foo/ produces /foo/index.html, but
// resolving index.html relative to /foo produces /index.html
// is different from resolving index.html relative to /foo/
// This removes any ambiguity between URL resolution rules and file path
// resolution which might lead to confusion.
if (options.root !== '' && !/[\/\\]$/.test(options.root)) {
  options.root += '/';
}
var workPath = path.resolve(options.root, options.workdir);
try {
  var workdir = fs.statSync(workPath);
  if (workdir) {
    console.log(workdir);
    console.log('Working directory already exists! Please clean up.');
    process.exit(1);
  }
} catch (err) {
  // This is good. The workdir shouldn't exist.
}
mkdirp.sync(workPath);

var vulcans = new ProgressiveVulcans(options);
vulcans.build().then(function(){
  console.log('Build success!');
  rimraf.sync(workPath, {});
}).catch(function(err){
  console.error(err.stack);
});

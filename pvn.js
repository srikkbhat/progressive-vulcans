/**
 * @license
 * Copyright (c) 2016 srikkbhat. All rights reserved.
 */
// jshint node:true
'use strict';
var async = require('async');
var hydrolysis = require('hydrolysis');
var mkdirp = require('mkdirp');
var url = require('url');
var Vulcan = require('vulcanize');
var fs = require('fs');
var Promise = require('es6-promise').Promise;
var path = require('path');
var yaml = require('js-yaml');

var ProgressiveVulcans = function ProgressiveVulcans(options) {
  this.bowerdir = options.bowerdir;
  this.definition = options.definition;
  this.root = options.root;
  this.destdir = url.resolve(this.root, options.destdir);
  this.elementsdir = url.resolve(this.root, options.elementsdir);
  this.workdir = options.workdir;
  this.built = false;
  this.pvnDefinitions = {};
  this.inImports = [];
  this.vulcanized = [];
  this.prevTargetFile = '';
  this.pvnPromises = [];
};


ProgressiveVulcans.prototype = {
  _getOptions: function () {
    var options = {};
    options.attachAST = true;
    options.filter = function () {
      return false;
    };
    options.redirect = this.bowerdir;
    options.root = this.root;
    return options;
  },
  _getFSResolver: function () {
    return new hydrolysis.FSResolver(this._getOptions());
  },
  _getAnalyzer: function (endpoint) {
    return hydrolysis.Analyzer.analyze(endpoint, this._getOptions());
  },
  _getDeps: function _getDeps(endpoint) {
    return this._getAnalyzer(endpoint).then(function (analyzer) {
      return analyzer._getDependencies(endpoint);
    }).catch(function (err) {
      console.log(err);
      console.log('FAILED IN GETDEPS');
    });
  },
  _getCommonDeps: function _getCommonDeps(endpoints, include, vulcanizeAll) {
    var endpointDeps = [];
    for (var i = 0; i < endpoints.length; i++) {
      endpointDeps.push(this._getDeps(endpoints[i]));
    }
    return Promise.all(endpointDeps).then(function (allEndpointDeps) {
        var common = {};
        allEndpointDeps.forEach(function (endpointDepList) {
          endpointDepList.forEach(function (dep) {
            //check dependency not in imports
            if (this.inImports.indexOf(dep) === -1) {
              if (this.vulcanized.indexOf(dep) !== -1) {
                //error. dependency is already vulcanized but not in imports.
                //Error not thrown as this.inImports and this.vulcanized contain result of hydrolysis.
                //Some elements that are excluded during vulcanize might still be in those arrays.
                //Needs fix.
                console.log('WARN - Element might be double vulcanized: ', dep);
              }
              if (!common[dep]) {
                common[dep] = 1;
              } else {
                common[dep] += 1;
              }
            }
          }.bind(this));
        }.bind(this));
        include.forEach(function (dep) {
          if (!common[dep]) {
            common[dep] = 2;
          } else {
            common[dep] += 1;
          }
        });

        var result = {};
        result.sharedDeps = [];
        result.nonSharedDeps = [];
        for (var dep in common) {
          if (common[dep] > 1 || vulcanizeAll === true) {
            result.sharedDeps.push(dep);
          } else {
            result.nonSharedDeps.push(dep);
          }
        }
        return result;
      }.bind(this))
      .catch(function (err) {
        console.log('err: ', err);
      });
  },
  _createSharedImports: function _createSharedImports(outFile, endpoints, include, vulcanizeAll) {
    return this._getCommonDeps(endpoints, include, vulcanizeAll).then(function (result) {

      /** Generate the file of shared imports. */
      var output = '';
      var workdirPath = url.resolve(this.root, this.workdir);
      var outputPath = url.resolve(workdirPath, outFile);
      var commonDeps = result.sharedDeps;
      var importUrl, depUrl;

      for (var dep in commonDeps) {
        depUrl = commonDeps[dep];
        importUrl = path.relative(workdirPath, url.resolve(this.root, depUrl));
        output += '<link rel="import" href="' + importUrl + '">\n';
      }
      var outDir = path.dirname(outputPath);
      mkdirp.sync(outDir);
      var fd = fs.openSync(outputPath, 'w');
      fs.writeSync(fd, output);
      return result;
    }.bind(this));
  },
  _vulcanizeResult: function _vulcanizeResult(sources, result, targetFile, vulcanizeAll, importParent, callback) {

    if (vulcanizeAll === false) {
      sources.forEach(function (source) {
        var outFile = path.basename(source.name);
        var outPath = url.resolve(this.destdir, outFile);
        var endpoint = source.name;
        var excludes = this.inImports.concat(result.sharedDeps);
        if (source.exclude && source.exclude.length > 0) {
          excludes = excludes.concat(source.exclude);
        }
        var endpointPromise = new Promise(function (resolve, reject) {
          var vulcan = new Vulcan({
            abspath: null,
            fsResolver: this._getFSResolver(),
            addedImports: [targetFile],
            stripExcludes: excludes,
            inlineScripts: true,
            inlineCss: true,
            stripComments: true,
            inputUrl: endpoint
          });
          try {
            vulcan.process(null, function (err, doc) {
              if (err) {
                reject(err);
              } else {
                var outDir = path.dirname(outPath);
                mkdirp.sync(outDir);
                var fd = fs.openSync(outPath, 'w');
                fs.writeSync(fd, doc);
                resolve(outPath);
              }
            }.bind(this));
          } catch (err) {
            console.error('Error writing output file!');
            reject(err);
          }
        }.bind(this));
        this.pvnPromises.push(endpointPromise);
      }.bind(this))
    }
    var parent = [];
    if (importParent === true && this.prevTargetFile.length > 0) {
      parent.push(this.prevTargetFile);
    }
    this.prevTargetFile = targetFile;
    var sharedVulcanPromise = new Promise(function (resolve, reject) {
      var sharedVulcan = new Vulcan({
        fsResolver: this._getFSResolver(),
        addedImports: parent,
        stripExcludes: this.inImports,
        inlineScripts: true,
        inlineCss: true,
        stripComments: true,
        inputUrl: url.resolve(this.workdir, targetFile)
      });
      try {
        sharedVulcan.process(null, function (err, doc) {
          if (err) {
            reject(err);
          } else {
            var outPath = url.resolve(this.destdir, targetFile);
            var outDir = path.dirname(outPath);
            mkdirp.sync(outDir);
            var fd = fs.openSync(outPath, 'w');
            fs.writeSync(fd, doc);
            resolve(outPath);
          }
        }.bind(this));
      } catch (err) {
        reject(err);
      }
    }.bind(this));
    this.pvnPromises.push(sharedVulcanPromise);
    this.vulcanized = this.vulcanized.concat(result.sharedDeps);
    this.vulcanized = this.vulcanized.concat(result.nonSharedDeps);
    this.inImports = this.inImports.concat(result.sharedDeps);
    console.log('INFO - End processing target: ', targetFile);
    callback();
  },
  _processShard: function _processShard(shard, callback) {
    console.log('INFO - Started processing target: ', shard.target);
    var _targetFile = shard.target;
    var _vulcanizeAll = (shard.hasOwnProperty('vulcanizeAll')) ? shard.vulcanizeAll : false;
    var _importParent = (shard.hasOwnProperty('importParent')) ? shard.importParent : true;
    var _include = (shard.hasOwnProperty('include')) ? shard.include : [];
    var _endpoints = [];

    shard.sources.forEach(function (source) {
      _endpoints.push(source.name);
    }.bind(this));
    if (_include.length > 0) {
      //concat twice to ensure they are considered as shared dependency.
      _endpoints = _endpoints.concat(_include).concat(_include);
    }
    this._createSharedImports(_targetFile, _endpoints, _include, _vulcanizeAll)
      .then(function (result) {
        this._vulcanizeResult(shard.sources, result, _targetFile, _vulcanizeAll, _importParent, callback);
      }.bind(this))
      .catch(function (err) {
        callback(err);
      })
  },
  _prepOutput: function _prepOutput() {
    var outDir = url.resolve(this.root, this.destdir);
    mkdirp.sync(outDir);
  },
  _loadYaml: function _loadYaml() {
    this.pvnDefinitions = yaml.safeLoad(fs.readFileSync(this.definition));
    this.pvnDefinitions.shards.forEach(function (shard) {
      shard.sources.forEach(function (source) {
        source.name = path.relative(this.root, path.resolve(this.elementsdir, source.name));
        if (source.exclude && source.exclude.length > 0) {
          source.exclude.forEach(function (exclude, ix) {
            source.exclude[ix] = path.relative(this.root, path.resolve(this.elementsdir, source.exclude[ix]));
          }.bind(this))
        }
      }.bind(this));
      if (shard.include && shard.include.length > 0) {
        shard.include.forEach(function (include, ix) {
          shard.include[ix] = path.relative(this.root, path.resolve(this.elementsdir, shard.include[ix]));
        }.bind(this));
      }
    }.bind(this));
  },
  build: function build() {
    if (this.built) {
      throw new Error('build may only be called once.');
    }
    this.built = true;
    this._prepOutput();
    this._loadYaml();
    return new Promise(function (resolve, reject) {
      async.eachSeries(
        this.pvnDefinitions.shards,
        this._processShard.bind(this),
        function (error) {
          if (error) {
            reject(error);
          }
          Promise.all(this.pvnPromises)
            .then(function () {
              resolve();
            })
            .catch(function (error) {
              reject(error);
            })
        }.bind(this)
      )
    }.bind(this));
  }
};

module.exports = ProgressiveVulcans;
'use strict';

var debug = require('debug')('metalsmith-s3');
var _ = require('underscore');
var front = require('front-matter');
var AWS = require('aws-sdk');
var mime = require('mime-types');
var async = require('async');

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to read/write/copy content using Amazon S3.
 *
 * @param {Object} options
 *   @property {String} bucket
 *   @property {String} action
 * @return {Function}
 */

function plugin(config) {

	checkProperty(config, 'bucket');
	checkProperty(config, 'action');

	return function(files, metalsmith, done) {
		var param = {};
		if (typeof config.s3 !== 'undefined'){
			param = config.s3;
		}
		// initialize the API
		var s3;
    if(config.region){
      s3 = new AWS.S3({
        region: config.region
      });
    }else{
      s3 = new AWS.S3();
    }

        switch(config['action']) {
		case 'copy' :
			CopyS3Objects();
			break;
		case 'read' :
			ReadS3Objects();
			break;
		case 'write' :
			WriteS3Objects();
			break;
		default :
			throw new TypeError('Unknown action ' + config['action'] + '. Please update your configuration');
			done();
        }

		function CopyS3Objects() {

			checkProperty(config, 'from');
			checkProperty(config, 'prefix');

			var filteritems = [];
			var patternitems = {};

			patternitems.prefix = '^';
			patternitems.suffix = '.*(?=[^\/]$)';
			patternitems.match = true;

			param.Bucket = config['bucket'];

			if (!Array.isArray(config['prefix'])) {
				filteritems = [config['prefix']];
			} else {
				filteritems = config['prefix'];
			}

			async.waterfall([
				function(next) {
					s3.listObjects(param, next);
				},
				function(response, next) {
					filterList(response, filteritems, patternitems, next);
				},
				function(response, next) {
					copyList(response, next);
				}
				],
				function(err, res) {
					result(err, res);
				}
			);
		}

		function ReadS3Objects() {

			checkProperty(config, 'ignore');

			var filteritems = [];
			var patternitems = {};

			patternitems.prefix = '(^';
			patternitems.suffix = '.*|.*\/$)';
			patternitems.match = false;

			param.Bucket = config['bucket'];

			if (!Array.isArray(config['ignore'])) {
				filteritems = [config['ignore']];
			} else {
				filteritems = config['ignore'];
			}

			async.waterfall([
				function(next) {
					s3.listObjects(param, next);
				},
				function(response, next) {
					filterList(response, filteritems, patternitems, next);
				},
				function(response, next) {
					readList(response, next);
				}
				],
				function(err, res) {
					result(err, res);
				}
			);
		}

		function WriteS3Objects() {

			param.Bucket = config['bucket'];

			async.waterfall([
				function(next) {
					writeList(param, next);
				}
				],
				function(err, res) {
					result(err, res);
				}
			);

		}

		function filterList(response, filteritems, patternitems, next) {
			var contents = response.Contents;
			contents = _.filter(contents, function(obj) {
				if (filteritems.some(function(item) {
					var regx = new RegExp(patternitems.prefix + item + patternitems.suffix);
					return regx.test(obj['Key']);
				})) {
					debug("filtering: " + obj['Key']);
					return patternitems.match;
				}
				return !patternitems.match;
			});
			next(null, contents);
		}

		function copyList(list, next) {
			async.each(list, function(obj, callback) {
				param.Key = obj.Key
				param.CopySource = config['from'] + "/" + param.Key;
				param.ContentType = mime.lookup(param.Key);
				s3.copyObject(param, function(err, res) {
					callback(err);
			    });
				debug("copying file: ", param.CopySource, " to ", param.Bucket);
			}, function(err) {
				next(err, 'S3 copy operation complete');
			});
		}

		function readList(list, next) {
			async.each(list, function(obj, callback) {
				param.Key = obj.Key
				s3.getObject(param).on('success', function(response) {
					var path = response.request.httpRequest.path;
					var spath = "/".concat(response.request.params.Bucket).concat("/");
					var data = response.data;
					var parsed = front(data.Body.toString());
					var file = {};

					path = path.replace(spath, '');

					file = parsed.attributes;
					file.contents = new Buffer(parsed.body);
					files[path] = file;
					debug("adding file: ", path);
					callback();
				}).send();
			}, function(err) {
				next(err, 'read from S3 done');
			});
		}

		function writeList(param, next) {
			async.each(Object.keys(files), function(file, callback) {
				var putParams = Object.assign({}, param, files[file].s3);
				putParams.Key = file;
				putParams.Body = files[file].contents;
				putParams.ContentType = (
					files[file].mimeType ||
					mime.lookup(file) ||
					undefined
				)
				debug("writing file: ", file, "with contentType = ", putParams.ContentType);
				s3.putObject(putParams, callback);
			}, function(err) {
				next(err, 'write to S3 done');
			});
		}

		function result(err, res) {
			if (err) {
				throw new TypeError('Error: ' + err);
			}
			debug(res);
			done();
		}
	}

	function checkProperty(object, property) {
		if ((object[property]) == null) {
			throw new TypeError('Missing property \'' + property + '\'. Please update the configuration settings appropriately.');
		}
	}
}

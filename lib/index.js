'use strict';

var each        = require('async').each
var debug       = require('debug')('metalsmith-s3read')
var _           = require('underscore')
var front	= require('front-matter')
var AWS         = require('aws-sdk')
var RSVP	= require('rsvp')

/**
 * Expose `plugin`.
 */

module.exports = plugin;

/**
 * Metalsmith plugin to retrieve content from Prismic.io and place in the file's metadata.
 *
 * @param {Object} options
 *   @property {String} url
 *   @property {String} accessToken (optional)
 * @return {Function}
 */

function plugin(config) {

    checkProperty(config, 'bucket');

    return function(files, metalsmith, done){
	var param = {};
	param.Bucket = config['bucket'];

        // initialize the API
	var s3 = new AWS.S3();

	var getS3Objects = function(s3, bucket) {
		
		var promise = new RSVP.Promise(function(resolve, reject) {
			var request = s3.listObjects(param);
			request.on('success', function(request) { resolve(request.data); });
			request.on('error', function(request) { reject(request.error); });
			request.send();
		});

		return promise;
	};
	
	var getS3Object = function(s3, param) {
		
		var promise = new RSVP.Promise(function(resolve, reject) {
			var object = s3.getObject(param);
			object.on('success', function(object) { resolve(object); });
			object.on('failure', function(object) {reject(object.error); });
			object.send();
		});
		
		return promise;
	};
	
	getS3Objects(s3, param).then(function(data) {
			
		var contents = data.Contents;
		var promises = contents.map(function(content) {
			param.Key = content.Key;
			return getS3Object(s3, param)
		});

		RSVP.all(promises).then(function(objects) {
			for (var index in objects) {
				var path = objects[index].request.httpRequest.path;
				var spath = "/".concat(objects[index].request.params.Bucket).concat("/");
				var data = objects[index].data;
				var parsed = front(data.Body.toString());
				var file = {};

				path = path.replace(spath,'');

				if (!path.match("\/$")) {
				file = parsed.attributes;
				file.contents = new Buffer(parsed.body);
				files[path] = file;
				debug("metalsmith-s3read adding file: ", path);
				}
			}
			debug("metalsmith-s3read done!");
			done();
		}).catch(function(error){
			console.log(error);
		});
		
	});			
    }


    function checkProperty(object, property) {
        if ((object[property]) == null) {
            throw new TypeError('Missing property \'' + property + '\'. Please update the configuration settings appropriately.');
        }
    }
}

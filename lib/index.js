'use strict';

var each        = require('async').each
var debug       = require('debug')('metalsmith-s3')
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
    checkProperty(config, 'action');

    return function(files, metalsmith, done){
	var param = {};
	param.Bucket = config['bucket'];

        // initialize the API
	var s3 = new AWS.S3();

	var getS3Objects = function(s3, param) {
		
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
	
	function S3Copy(s3, param, cb) {
		debug("copying: ", param.CopySource, " to ", param.Bucket, "/", param.Key);
		s3.copyObject(param, function(err, res) {
			if (err) { cb(err); }
			debug(res); 
			cb();
		});
	}

        switch(config['action']) {
		case 'copy':
			if (!Array.isArray(config['prefix'])) {
				var prefixes = [ config['prefix'] ];
			}
			else {
				var prefixes = config['prefix'];
			}

			for (var index in prefixes) {
				param.Prefix = prefixes[index]+"/";
				param.Bucket = config['from'];
				getS3Objects(s3, param).then(function(data) {
					var contents = data.Contents;
					for (var index in contents) {
						var param = {}
						param.Bucket = config['bucket'];
						param.Key = contents[index].Key;
						param.CopySource = config['from']+"/"+param.Key;
						S3Copy(s3, param, function(err) {
							if (err) { console.error(err); };
						});
					}
				});
			}
			done();
			break;
		case 'read':
			getS3Objects(s3, param).then(function(data) {
			
				var contents = data.Contents;
				contents = _.filter(contents, function (obj) { 
					if ( config['ignore'].some( function (item) {
						var regx = new RegExp('^'+item);
						return regx.test(obj['Key']);
					}) ) { return false }
					return true; 
				});
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
							debug("metalsmith-s3 adding file: ", path);
						}
					}
					debug("metalsmith-s3 done!");
					done();
				}).catch(function(error){
					console.log(error);
				});
		
			});
			break;
		default:
			console.error("metalsmith-s3: unknown action");
			done();
	}
    }


    function checkProperty(object, property) {
        if ((object[property]) == null) {
            throw new TypeError('Missing property \'' + property + '\'. Please update the configuration settings appropriately.');
        }
    }
}

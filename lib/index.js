'use strict';

var debug	= require('debug')('metalsmith-s3');
var _		= require('underscore');
var front	= require('front-matter');
var AWS	= require('aws-sdk');
var RSVP	= require('rsvp');
var mime	= require('mime-types');
var async	= require('async');

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

	console.log('step 2...');
	
	checkProperty(config, 'bucket');
	checkProperty(config, 'action');
	
	console.log('step 3...');

	return function(files, metalsmith, done){
		       console.log('step 5...');

		       var param = {};
		       param.Bucket = config['bucket'];
		       console.log('step 6...');
		       // initialize the API
		       var s3 = new AWS.S3();
		       console.log('step 7...');
		       var getS3Objects = function(s3, param) {
			                          console.log('step 15...');
			                          var promise = new RSVP.Promise(function(resolve, reject) {
				                                                         console.log('step 16...');
				                                                         var request = s3.listObjects(param);
				                                                         request.on('success', function(request) { resolve(request.data); });
				                                                         request.on('error', function(request) { reject(request.error); });
				                                                         request.send();
				                                                         console.log('step 17...');
			                                                         });
			                          console.log('step 18...');
			                          return promise;
		                          };
		       console.log('step 8');
		       var getS3Object = function(s3, param) {

			                         var promise = new RSVP.Promise(function(resolve, reject) {
				                                                        var object = s3.getObject(param);
				                                                        object.on('success', function(object) { resolve(object); });
				                                                        object.on('failure', function(object) {reject(object.error); });
				                                                        object.send();
			                                                        });

			                         return promise;
		                         };
		       console.log('step 9');
		       function S3Copy(s3, param, cb) {
			       if (!param['Key'].match("\/$")) {
				       console.log("copying: ", param.CopySource, " to ", param.Bucket, "/", param.Key);
				       s3.copyObject(param, function(err, res) {
					                     if (err) { cb(err); }
					                     console.log(res);
					                     cb();
				                     });
			       }
		       }
		       console.log('step 10...');
		       var putS3Object = function(s3, param) {
			                         var promise = new RSVP.Promise(function(resolve, reject) {
				                                                        var request = s3.putObject(param);
				                                                        request.on('success', function(request) {
					                                                                   console.log(request.data);
					                                                                   resolve(request.data);
				                                                                   });
				                                                        request.on('failure', function(request) { reject(request.err); });
				                                                        request.send();
			                                                        });

			                         return promise;
		                         };
		       console.log('step 11...');
		       switch(config['action']) {
		       case 'copy':
			       console.log('step 12');
			       if (!Array.isArray(config['prefix'])) {
				       var prefixes = [ config['prefix'] ];
			       }
			       else {
				       var prefixes = config['prefix'];
			       }
			       
			       async.waterfall([
		       	       		       function(next) {
		       	       		       	       param.Bucket = config['from'];
		       	       		       	       console.log('step 13...');
		       	       		       	       s3.listObjects(param, next);
		       	       		       },
		       	       		       function(response, next) {
		       	       		       	       console.log('step 14...');
		       	       		       	       var contents = response.Contents;
		       	       		       	       contents = _.filter(contents, function (obj) {
		       	       		       	       		               console.log(prefixes);
					                                                        if ( prefixes.some( function (item) {
					                                                                                    var regx = new RegExp('^'+item + '.*(?=[^\/]$)');
					                                                                                    	//console.log(regx.toString());
					                                                                                    	//console.log(obj['Key']);
					                                                                                    	//console.log(regx.test(obj['Key']));
						                                                                                    return regx.test(obj['Key']);
					                                                                                    }) ) { return true }
					                                                                                                  return false;
				                                                        });
				                                   console.log('step 15...');
		   		                       	       async.each(contents, function(obj, cb) {
				                       	      		      console.log('step 16 - get...');
				                       	      		      param.Key = obj.Key
				                       	      		      param.Bucket = config['bucket'];
						                                  param.CopySource = config['from']+"/"+param.Key;
						                                  param.ContentType = mime.lookup(param.Key);
				                       	      		      console.log(param);
				                       	      		      s3.copyObject(param, function(err, res) {
				                       	      		      		      if (err) { cb(err); }
				                       	      		      		      console.log(res);
				                       	      		      		      cb();
				                       	      		      });
						      }, function (err) {
				                       	              console.log('step 17...');
				                       	      	if (err) { console.log(err); } else
				                       	      	            { console.log('done'); } 
				                       	      	next(err, 'done');
				                       	      });
				               }
			       ], function(err, result) {
			       	       if (err) { 
			       	       	       console.log(error);
			       	       }
			       	       else {
			       	       	       console.log(result);
			       	       }
			       	       console.log("copying done!");
			       	       done();
			       });
			       break;
		       case 'read':
			       console.log('step 13...');
		       	       async.waterfall([
		       	       		       function(next) {
		       	       		       	       console.log('step 19...');
		       	       		       	       s3.listObjects(param, next);
		       	       		       },
		       	       		       function(response, next) {
		       	       		       	       console.log('step 20...');
		       	       		       	       var contents = response.Contents;
		       	       		       	       contents = _.filter(contents, function (obj) {
					                                                        if ( config['ignore'].some( function (item) {
					                                                                                    var regx = new RegExp('(^'+item + '.*|.*\/$)');
						                                                                                    return regx.test(obj['Key'])
					                                                                                    }) ) { return false }
					                                                                                                  return true;
				                                                        });
				                       	      console.log('step 21...');
				                       	      async.each(contents, function(obj, cb) {
				                       	      		      console.log('step 22 - get...');
				                       	      		      param.Key = obj.Key
				                       	      		      console.log(param);
				                       	      		      s3.getObject(param).on('success', function(response) {
						                                                            var path = response.request.httpRequest.path;
						                                                            var spath = "/".concat(response.request.params.Bucket).concat("/");
						                                                            var data = response.data;
						                                                            var parsed = front(data.Body.toString());
						                                                            var file = {};

						                                                            path = path.replace(spath,'');

							                                                            file = parsed.attributes;
							                                                            file.contents = new Buffer(parsed.body);
							                                                            files[path] = file;
							                                                            console.log("metalsmith-s3 adding file: ", path);
				                       	      		      cb();}).send();
						      }, function (err) {
				                       	              console.log('step 24...');
				                       	      	if (err) { console.log(err); } else
				                       	      	            { console.log('done'); } 
				                       	      	next(err, 'done');
				                       	      });
		       	       		       }
		       	       ], function (err, result) {
		       	       	       if (err) { console.log(err); }
		       	       	       console.log(result);
		       	       	       console.log("Reading Done!");
		       	       	       done();
		       	       });
			       break;
		       case 'write':
			       console.log('step 14...');
			       var promises = Object.keys(files).map(function (file) {
				                                             param.Key = file;
				                                             param.Body = files[file].contents;
				                                             param.ContentType = mime.lookup(file);
				                                             console.log("writing ", file, " to ", param.Bucket);
				                                             return putS3Object(s3, param);
			                                             });

			       RSVP.all(promises).then(function(objects) {
				                               console.log("metalsmith-s3 writing done");
				                               done();
			                               }).catch(function(error){
				                                        console.log(error);
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

	       console.log('step 4...');
}

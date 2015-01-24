var equal = require('assert-dir-equal');
var Metalsmith = require('metalsmith');
var s3read = require('..');
var templates = require('metalsmith-templates');

describe('metalsmith-s3read', function(){
    it('should retrieve content from S3', function(done){
        Metalsmith('test/fixtures/basic')
            .use(s3read({
                "bucket": "metalsmith-s3read-test"
            }))

            .use (log())

            // use Handlebars templating engine to insert content
            //.use(templates({
            //    "engine": "handlebars"
            //}))

            .build(function(err){
                if (err) return done(err);
                equal('test/fixtures/basic/expected', 'test/fixtures/basic/build');
                done();
            });
    });

});



// Used for debugging purposes only
function log() {
    return function (files, metalsmith, done){
        for (var file in files) {
                console.log("%s: %s", file, JSON.stringify(files[file]))
        }
        done();
    };
}

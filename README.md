# metalsmith-s3
Metalsmith plugin for reading/writing/copying files on AWS S3.

Example usage: [nonLinear.zone build process](https://github.com/mwishek/nonlinear.build).

# Installation
```
$ npm install metalsmith
```

# Usage
```node
var Metalsmith = require('metalsmith');
var permalinks = require('metalsmith-s3');

var metalsmith = new Metalsmith(__dirname)
  .use(s3({
    action: 'copy',
    bucket: 's3-bucket-dest',
    from: 's3-bucket-src',
    prefix: ['images/', 'js/']
  }));
  .use(s3({
    action: 'read',
    bucket: 's3-bucket-src',
    ignore: ['images/', 'js/']
  }));
  ...
  .use(s3({
    action: 'write',
    bucket: 's3-bucket-dest'
  }));
```

# Actions
### Read

The _read_ action will read files from an S3 bucket which can then be processed by plugins later in the chain. The _read_ action can be modified to ignore certain prefixes in the S3 bucket be setting the _ignore_ to a prefix, or an array of prefixes.

#### Read Parameters:

bucket: source S3 bucket  
ignore: a prefix or array of prefixes _not_ to be read from the source S3 bucket  

### Copy

The _copy_ action will copy files from a source S3 bucket to a destination S3 bucket. The _copy_ action must include a _prefix_ parameter to specifiy one or more prefixes to be processed.

#### Copy Parameters

bucket: destination S3 bucket  
from: source S3 bucket  
prefix: a prefix or array of prefixes to be copied from the source S3 bucket  

### Write

The _write_ action will write all files to the destination S3 bucket.  

#### Write Parameters

bucket: destination S3 bucket

# TODO
1. Test suite

#License

The MIT License (MIT)

Copyright © 2015, Matthew Wishek <[mwishek@gmail.com](mailto:mwishek@gmail.com)>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

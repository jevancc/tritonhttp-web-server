<!-- Your testing strategy/code should be put into this directory.

Put any scripts or source code here.

If you used a combination of 'printf' and 'nc' commands or other similar command-line approaches
for testing your code, put them in a file (e.g. TESTING.txt, TESTING.md, etc).  Please
indicate within your code or write-up which tests are associated with each rubric item.

Thank you. -->

# Testing Strategies
We wrote out testing script in Node.js, and we devided the test cases into three files: ```basic.test.js```, ```subdir.test.js```, and ```mime-types.test.js```, and ```concurr-pipe.test.js```. 


To run the test cases run the following command:
```$ npm test```

## basic.test.js
In this file, we tested cases including: valid format, find valid files, and timeout/close.

### Valid format

#### should respond 400 when Slash Missing.
- After a client connected to the server, the client sent a http request with a ```missing slash URL```. We expected the response contained 400 code.

#### should respond 400 when HTTP/1.1 Missing.
- After a client connected to the server, the client sent a http request with ```HTTP/1.0``` in initial line. We expected the response contained 400 code.

#### should respond 400 when sending non-supported request format, ex. POST.
- After a client connected to the server, the client sent a http request with ```POST``` in initial line. We expected the response contained 400 code.

#### should respond 400 when Host is not presented request.
- After a client connected to the server, the client sent a http request without ```Host``` in headers. We expected the response contained 400 code.

#### should respond nothing when sending no request.
- After a client connected to the server, the client did nothing. We expected the connection was established and nothing in response.

### find valid files

#### should respond 200 and correct content when file exists.
- After a client connected to the server, the client sent a http request of a existed file. We expected the response contained 200 code and correct file content.

#### should respond 404 when file not exists.
- After a client connected to the server, the client sent a http request of a non-existed file. We expected the response contained 404 code.

#### should respond 200 and file correct content when a large file exists.
- After a client connected to the server, the client sent a http request of a large file (10 MB). We expected the response contained 200 code and correct large file content (10 MB).

#### should respond the existed file content with correct content when there is a large request.
- After a client connected to the server, the client sent a http request with 100000 headers. We expected the response contained 200 code and correct file content.

### timeout/close

#### should respond 400 and close connection when there is partial request.
- After a client connected to the server, the client sent a http request with a dangling header ```\r\n```. We expected the server timeout and close connection with 400 response.

#### should end connection when the client close connection.
- After a client connected to the server, the client shut down the connection. We expected the connection was closed.


## subdir.test.js

### file paths

#### should respond 200 when file exists.
- After a client connected to the server, the client sent a http request of a existed file. We expected the response contained 200 code.

#### should respond 200 when file exists in subdir.
- After a client connected to the server, the client sent a http request of a existed file in a subdirectory. We expected the response contained 200 code and correct file content.

#### should respond 404 when file does not exists in subdir.
- After a client connected to the server, the client sent a http request of a non-existed file in a subdirectory. We expected the response contained 404 code.

#### should respond 404 when subdir does not exist.
- After a client connected to the server, the client sent a http request of a file in a non-existed subdirectory. We expected the response contained 404 code.

#### should redirect to index.html when path is a dir.
- After a client connected to the server, the client sent a http request of directory URL. We expected the response contained 200 code and correct file content of ```index.html```.

#### should redirect to subdir/index.html when path is a subdir.
- After a client connected to the server, the client sent a http request of subdirectory URL. We expected the response contained 200 code and correct file content of ```subdir/index.html```.

#### should support relative path.
- After a client connected to the server, the client sent a http request with ```/dir1/../root.txt``` URL. We expected the response contained 200 code and correct file content.

#### should support relative path traversal.
- After a client connected to the server, the client sent a http request with ```/dir1/../dir2/file2.txt``` URL. We expected the response contained 200 code and correct file content.

#### should support complicated relative path traversal.
- After a client connected to the server, the client sent a http request with ```/dir1/../dir2/../dir1/dir11/../dir12/../../root.txt``` URL. We expected the response contained 200 code and correct file content.

#### should respond 404 when path escape document root.
- After a client connected to the server, the client sent a http request with ```/dir1/../../``` URL which escaped the document root. We expected the response contained 404 code.

#### should respond 404 when path escape document root (escape filesystem root).
- After a client connected to the server, the client sent a http request with ```/dir1/../../../../../../../../../../../../../../../../``` URL which escaped the filesystem root. We expected the response contained 404 code.

#### should support escape doc root and traverse back to root.
- After a client connected to the server, the client sent a http request with ```/dir1/../../SERVER_ROOT/dir1/file1.txt``` URL which escape doc root but traverse back to root. We expected the response contained 200 code and correct file content.


## concurr-pipe.test.js

### concurrency

#### should respond 200 and same modified time from different clients.
- After four clients connected to the server, each client sent a http request of different existed files  We expected the response contained 200 code and the same modified time from these clients.

#### should respond 400 and close connections when there is malformed request.
- After four clients connected to the server, two clients sent a http request of different existed files and the others send requests of non-existed files. We expected the response contained 200 code and the same modified time from correct request clients, and 404 from the others.

### pipeline

#### should respond correct content when a client send multiple requests and close connection after timeout.
- After a client connected to the server, the client sent five consecutive http requests within 5 seconds, which the last request was non existing file and the others were existed files. We expected response contained 200 code and correct file content, and the last response contained 404 code; the connection should closed after 7 seconds.

#### should respond 200 and correct content when file exists and close connection when the request is malformed.
- After a client connected to the server, the client sent two consecutive http requests, which the last request was malformed. We expected first response contained 200 code and correct file content; the last response contained 400 code and closed the connection. 

#### should not process the next request after connection close.
- After a client connected to the server, the client sent three consecutive http requests, which the second request was malformed. We expected first response contained 200 code and correct file content; the second response contained 400 code and closed the connection, while there was no response for the last request.


## mime-types.test.js

### support all MIME types

#### should respond with content-type (basic).
- After a client connected to the server, the client sent a valid http requests of ```/test.zip```. We expected the response contained correct content-type.

#### should respond content-type for unknown file extension.
- After a client connected to the server, the client sent a valid http requests of non-supported type ```/test.xxxx```. We expected the response respond correct content-type as ```application/octet-stream```.

### should respond with content-type (pipeline & comprehensive), i.e., all the data types in MIME types.
- After a client connected to the server, the client sent a valid http requests of all data type in MIME. We expected the response respond correct content-type and content.

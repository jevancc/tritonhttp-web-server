<!-- Your testing strategy/code should be put into this directory.

Put any scripts or source code here.

If you used a combination of 'printf' and 'nc' commands or other similar command-line approaches
for testing your code, put them in a file (e.g. TESTING.txt, TESTING.md, etc).  Please
indicate within your code or write-up which tests are associated with each rubric item.

Thank you. -->

# Testing Strategies
We wrote out testing script in Node.js, and we devided the test cases into three files: ```basic.test.js```, ```subdir.test.js```, and ```mime-types.test.js```, and ```concurr-pipe.test.js```. 
To run the test cases run the following command:
```nmp test```

## basic.test.js
In this file, we tested cases including: valid format, find valid files, and timeout/close.

For valid format we tested the following cases:
1. should respond 400 when Slash Missing.
2. should respond 400 when HTTP/1.1 Missing.
3. should respond 400 when HTTP version mismatch.
3. should respond 400 when sending non-supported request format, ex. POST.
4. should respond 400 when Host is not presented request.
5. should respond 200 and nothing when sending no request.

For find valid files, we tested the following cases:
1. should respond 200 and correct content when file exists.
2. should respond 404 when file not exists.
3. should respond 200 and file correct content when a large file exists.
4. should respond the existed file content with correct content when there is a large request.

For timeout/close, we tested the following cases:
1. should respond 400 and close connection when there is partial request.
2. should end connection when the client close connection.


## subdir.test.js
In this file, we tested cases of file paths.
1. should respond 200 when file exists.
2. should respond 200 when file exists in subdir.
3. should respond 404 when file does not exists in subdir.
4. should respond 404 when subdir does not exist.
5. should redirect to index.html when path is a dir.
6. should redirect to subdir/index.html when path is a subdir.
7. should support relative path, ex. ```/dir1/../root.txt```
8. should support relative path traversal, ex. ```/dir1/../dir2/file2.txt```
9. should support complicated relative path traversal, ex. ```/dir1/../dir2/../dir1/dir11/../dir12/../../root.txt```
10. should respond 404 when path escape document root, ex. ```/dir1/../../```
11. should respond 404 when path escape document root (escape filesystem root), ex. ```/dir1/../../../../../../../../../../../../../../../../```
12. should support escape doc root and traverse back to root, ex. ```/dir1/../../SERVER_ROOT/dir1/file1.txt```


## concurr-pipe.test.js
In this file, we tested cases of pipeline and concurrency.

For concurrency, we tested the following cases:
1. should respond 200 and same modified time from different clients.
2. should respond 400 and close connections when there is malformed request.

For pipeline, we tested the following cases:
1. should respond correct content when a client send multiple requests and close connection after timeout.
2. should respond 404 when there is nonexisted file.
3. should respond 200 and correct content when file exists and close connection when the request is malformed.
4. should not process the next request after connection close.


## mime-types.test.js
In this file, we tested cases of every MIME types.
1. should respond with content-type (basic), ex. ```/test.zip```.
2. should respond content-type for unknown file extension, ex. ```/test.xxxx```.
3. should respond with content-type (pipeline & comprehensive), i.e., all the data types in MIME types.

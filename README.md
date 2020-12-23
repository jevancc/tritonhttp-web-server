# TritonHTTP Web Server

![Build & Test](
    https://github.com/jevancc/tritonhttp-web-server/workflows/Build%20&%20Test/badge.svg)
![Format & Lint](
    https://github.com/jevancc/tritonhttp-web-server/workflows/Format%20&%20Lint/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<div align="center"><img width="300" src="./ucsd-logo.png" /></div>

A simple web server implements TritonHTTP, a subset of the HTTP/1.1 protocol specification. Through the TritonHTTP web server, clients can connect to the server TCP socket using TritonHTTP protocol to retrieve files from the server. The TritonHTTP web server is able to map the URL in the request to the local file paths to serve the requested content. 

TritonHTTP is a client-server protocol that is layered on top of the reliable stream-oriented transport protocol TCP. Jump to the spec to learn more about TritonHTTP.

## Usage
### Step 0: Install Go and Node.js

You need to [install Go](https://golang.org/doc/install) to build and run the web server.

The tests are written in JavaScript. To run the tests locally, you need to install [Node.js](https://nodejs.org/en/).


### Step 1: Set environment variables

If you have Node.js installed locally, there are npm scripts to build the project and run the test that sets the environment variables automatically. To use the npm scripts, you need to install the dependencies first with the command:
```
npm install
```

Otherwise, you need to add directory into ```.bash_profile``` (for OS X environment) or ```.bashrc``` to let the compiler knows where to find the dependencies
```
export PATH=$PATH:/usr/local/go/bin     # making sure go is on path
export GOPATH=<path-to-repo>
export PATH=$PATH:$GOPATH/bin
 ```
example:
```
export GOPATH=/[The directory you put this folder]/Project-1/
export PATH=$PATH:$GOPATH/bin
```

### Step 2: Install Go denepdency
When you run your code, we are currently using the run-server.sh script. It basically runs a immediate compilation and looks for dependency. You will encounter errors like:
```
	cannot find package "github.com/go-ini/ini" in any of:
		/usr/local/go/src/github.com/go-ini/ini (from $GOROOT)
		/Desktop/Project-1/src/github.com/go-ini/ini (from $GOPATH)
```
That's because we usually don't include the dependency directory into our repository. Thus, we need to download the dependency.
example:
```
go get github.com/go-ini/ini
```

You can also install the go dependency with npm script:
```
npm run intall:go
```


### Step 3: Run the server
Now, you should be able to run the script. 
```
run-server.sh [config_file]
```
In the config file, under the [httpd] section, set 
<li> `use_default_server=true` to run Go's internal http web server 
<li> `use_default_server=false` to run your TritonHTTP web server

## Testing
To run the test, you need to install the Node.js test dependencies first with the following command:
```
npm install
```
The test is also available through npm script. With the following command, it will automatically build the code and run the test suites.
```
npm run test
```  
For more information of the testing, jump to [README.md inside the testing folder](testing/README.md).

## Project Structure

### main
The server program starts in
```
/src/main/main.go
```

### tritonhttp
1. `httpd_structs.go` has the structures that can be used to initialize the new server
2. `httpd_server.go` has the methods for initializing and starting the new server
3. `http_request_handler.go` has the methods for handling an incoming connection and subsequent requests
4. `http_response_handler.go` has the methods for handling various types of responses based on the request
5. `server_utils.go` has utility functions

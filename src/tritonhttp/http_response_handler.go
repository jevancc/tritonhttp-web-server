package tritonhttp

import (
	"net"
)

func (hs *HttpServer) handleBadRequest(conn net.Conn) {
	panic("todo - handleBadRequest")
}

func (hs *HttpServer) handleFileNotFoundRequest(requestHeader *HttpRequestHeader, conn net.Conn) {
	panic("todo - handleFileNotFoundRequest")
}

func (hs *HttpServer) handleResponse(requestHeader *HttpRequestHeader, conn net.Conn) (result string) {
	panic("todo - handleResponse")
}

func (hs *HttpServer) sendResponse(responseHeader HttpResponseHeader, conn net.Conn) {
	panic("todo - sendResponse")

	// Send headers

	// Send file if required

	// Hint - Use the bufio package to write response
}

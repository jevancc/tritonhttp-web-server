package tritonhttp

import (
	"fmt"
	"net"
	"strconv"
)

var WEEKDAY_STRINGS = []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
var MONTH_STRINGS = []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

func (hs *HttpServer) handleBadRequest(conn net.Conn) {
	panic("todo - handleBadRequest")
}

func (hs *HttpServer) handleFileNotFoundRequest(requestHeader *HttpRequestHeader, conn net.Conn) {
	panic("todo - handleFileNotFoundRequest")
}

func (hs *HttpServer) handleResponse(requestHeader *HttpRequestHeader, conn net.Conn) {
	responseHeader := HttpResponseHeader{
		Code:        "200",
		Description: "OK",
		Server:      requestHeader.Host,
		Connection:  "close",
	}

	body := "Hello World"
	hs.sendResponse(responseHeader, []byte(body), conn)
}

func makeResponseInitialLine(code string, description string) string {
	return fmt.Sprintf("HTTP/1.1 %s %s\r\n", code, description)
}
func makeResponseKeyValue(key string, value string) string {
	return fmt.Sprintf("%s: %s\r\n", key, value)
}

func (hs *HttpServer) sendResponse(responseHeader HttpResponseHeader, body []byte, conn net.Conn) {
	responseHeader.ContentLength = strconv.Itoa(len(body))

	// Send headers
	var responseHeaderString string
	responseHeaderString += makeResponseInitialLine(responseHeader.Code, responseHeader.Description)
	responseHeaderString += makeResponseKeyValue("Server", responseHeader.Server)
	responseHeaderString += makeResponseKeyValue("Content-Type", responseHeader.ContentType)
	responseHeaderString += makeResponseKeyValue("Content-Length", responseHeader.ContentLength)
	if len(responseHeader.LastModified) > 0 {
		responseHeaderString += makeResponseKeyValue("Last-Modified", responseHeader.LastModified)
	}
	if len(responseHeader.Connection) > 0 {
		responseHeaderString += makeResponseKeyValue("Connection", responseHeader.Connection)
	}

	// Send file if required
	conn.Write([]byte(responseHeaderString))
	conn.Write([]byte("\r\n"))
	conn.Write(body)
}

package tritonhttp

import (
	"fmt"
	"io/ioutil"
	"net"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"time"
)

func (hs *HttpServer) handleBadRequest(conn net.Conn) {
	responseHeader := HttpResponseHeader{
		Code:        "400",
		Description: "Bad Request",
		Connection:  "close",
		ContentType: "text/html",
	}

	body := "<h1>Bad Request</h1>"

	hs.sendResponse(responseHeader, []byte(body), conn)
}

func (hs *HttpServer) handleFileNotFoundRequest(requestHeader *HttpRequestHeader, conn net.Conn) {
	connectionResponse := ""
	if requestHeader.IsConnectionClose() {
		connectionResponse = "close"
	}

	responseHeader := HttpResponseHeader{
		Code:        "404",
		Description: "Not Found",
		Connection:  connectionResponse,
		ContentType: "text/html",
	}

	body := fmt.Sprintf(`
	<h1>File Not Found</h1>
	<p>The requested file "%s" does not exist</p>
	`, requestHeader.URL)

	hs.sendResponse(responseHeader, []byte(body), conn)
	conn.Close()
}

func (hs *HttpServer) handleResponse(requestHeader *HttpRequestHeader, conn net.Conn) {
	if requestHeader.Host == "" {
		hs.handleBadRequest(conn)
		return
	}

	fileName := path.Join(hs.DocRoot, requestHeader.URL)
	if fileRel, err := filepath.Rel(hs.DocRoot, fileName); err != nil || (len(fileRel) >= 2 && fileRel[:2] == "..") {
		// Beyond doc root
		hs.handleFileNotFoundRequest(requestHeader, conn)
	} else if fileName, fileContent, err := readFileOrDirIndexHTML(fileName); err != nil {
		// Failed to read the file
		hs.handleFileNotFoundRequest(requestHeader, conn)
	} else {
		fileExt := filepath.Ext(fileName)
		fileType := hs.GetMIMEType(fileExt)

		connectionResponse := ""
		if requestHeader.IsConnectionClose() {
			connectionResponse = "close"
		}
		responseHeader := HttpResponseHeader{
			Code:         "200",
			Description:  "OK",
			ContentType:  fileType,
			Connection:   connectionResponse,
			LastModified: getLastModifiedString(time.Now()),
		}
		hs.sendResponse(responseHeader, fileContent, conn)
	}
}

func readFileOrDirIndexHTML(fileName string) (string, []byte, error) {
	fileInfo, err := os.Lstat(fileName)
	if err != nil {
		// file does not exist or failed to access
		return fileName, nil, err
	}

	switch mode := fileInfo.Mode(); {
	case mode.IsRegular():
		content, err := ioutil.ReadFile(fileName)
		return fileName, content, err
	case mode.IsDir():
		fileName = path.Join(fileName, "./index.html")
		return readFileOrDirIndexHTML(fileName)
	default:
		return fileName, nil, err
	}
}

func (hs *HttpServer) sendResponse(responseHeader HttpResponseHeader, body []byte, conn net.Conn) {
	responseHeader.ContentLength = strconv.Itoa(len(body))
	responseHeader.Server = "TritonHTTP"

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

func makeResponseInitialLine(code string, description string) string {
	return fmt.Sprintf("HTTP/1.1 %s %s\r\n", code, description)
}

func makeResponseKeyValue(key string, value string) string {
	return fmt.Sprintf("%s: %s\r\n", key, value)
}

func getLastModifiedString(t time.Time) string {
	var weekdayStrings = []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	var monthStrings = []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

	t = t.UTC()
	return fmt.Sprintf(
		"%s, %02d %s %04d %02d:%02d:%02d GMT",
		weekdayStrings[t.Weekday()],
		t.Day(),
		monthStrings[t.Month()-1],
		t.Year(),
		t.Hour(),
		t.Minute(),
		t.Second(),
	)
}

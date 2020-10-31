package tritonhttp

import "errors"

type HttpServer struct {
	ServerPort string
	DocRoot    string
	MIMEPath   string
	MIMEMap    map[string]string
}

type HttpResponseHeader struct {
	// Add any fields required for the response here
	Code          string
	Description   string
	Server        string
	LastModified  string
	Connection    string
	ContentType   string
	ContentLength string
}

type HttpRequestHeader struct {
	// Add any fields required for the request here
	Method        string
	URL           string
	Version       string
	IsInitialLine bool
	Host          string
	Connection    string
}

/**
	Create HttpRequestHeader instance
**/
func NewHttpRequestHeader() HttpRequestHeader {
	header := HttpRequestHeader{}
	header.IsInitialLine = false
	return header
}

/**
	If the HTTP request header has key-value "Connection: close"
**/
func (req *HttpRequestHeader) IsConnectionClose() bool {
	return req.Connection == "close"
}

/**
	Validate if the request header has proper values
**/
func (req *HttpRequestHeader) Validate() error {
	switch {
	case req.Host == "":
		return errors.New("Host not provided in request header")
	case req.URL == "" || req.URL[0] != '/':
		return errors.New("URL must start with a forward slash (\"/\")")
	case req.Method != "GET":
		return errors.New("Unknown HTTP method")
	case req.Version != "HTTP/1.1":
		return errors.New("HTTP version not supported")
	default:
		return nil
	}
}

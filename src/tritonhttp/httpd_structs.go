package tritonhttp

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

package tritonhttp

type HttpServer	struct {
	ServerPort	string
	DocRoot		string
	MIMEPath	string
	MIMEMap		map[string]string
}

type HttpResponseHeader struct {
	// Add any fields required for the response here
}

type HttpRequestHeader struct {
	// Add any fields required for the request here
}
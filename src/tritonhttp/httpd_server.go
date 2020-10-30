package tritonhttp

import "net"

/**
	Initialize the tritonhttp server by populating HttpServer structure
**/
func NewHttpdServer(port, docRoot string, MIMEPath string) (*HttpServer, error) {
	// Initialize mimeMap for server to refer
	MIMEMap, err := ParseMIME(MIMEPath)
	if err != nil {
		return nil, err
	}

	httpServer := HttpServer{
		ServerPort: port,
		DocRoot:    docRoot,
		MIMEPath:   MIMEPath,
		MIMEMap:    MIMEMap,
	}

	// Return pointer to HttpServer
	return &httpServer, nil
}

/**
	Start the tritonhttp server
**/
func (hs *HttpServer) Start() (err error) {

	// Start listening to the server port
	ln, err := net.Listen("tcp", hs.ServerPort)
	if err != nil {
		return err
	}
	defer ln.Close()

	// Accept connection from client
	for {
		// Spawn a go routine to handle request
		conn, err := ln.Accept()
		if err != nil {
			return err
		}
		go hs.handleConnection(conn)
	}
}

func (hs *HttpServer) GetMIMEType(ext string) string {
	if val, ok := hs.MIMEMap[ext]; ok {
		return val
	}
	return "application/octet-stream"
}

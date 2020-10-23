package tritonhttp

/** 
	Initialize the tritonhttp server by populating HttpServer structure
**/
func NewHttpdServer(port, docRoot, mimePath string) (*HttpServer, error) {
	panic("todo - NewHttpdServer")

	// Initialize mimeMap for server to refer

	// Return pointer to HttpServer
}

/** 
	Start the tritonhttp server
**/
func (hs *HttpServer) Start() (err error) {
	panic("todo - StartServer")

	// Start listening to the server port

	// Accept connection from client

	// Spawn a go routine to handle request

}


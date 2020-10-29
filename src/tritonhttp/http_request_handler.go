package tritonhttp

import (
	"bufio"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

/*
For a connection, keep handling requests until
	1. a timeout occurs or
	2. client closes connection or
	3. client sends a bad request
*/
func (hs *HttpServer) handleConnection(conn net.Conn) {
	// If reusing read buffer, truncate it before next read

	fmt.Printf("HandleConnection :: %s\n", conn.RemoteAddr().String())
	defer conn.Close()

	reader := bufio.NewReader(conn)

	httpRequestBuffer := ""
	currentHttpRequest := NewHttpRequestHeader()

	// Start a loop for reading requests continuously
	for isHandlingConnection := true; isHandlingConnection; {
		// Set a timeout for read operation
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))

		// Read from the connection socket into a buffer
		if b, err := reader.ReadByte(); err != nil {
			// Reaching the end of the input or an error
			fmt.Println("Conn end", err)
			break
		} else if len(httpRequestBuffer)+1 > 1024 {
			// Bad request
			hs.handleBadRequest(conn)
			isHandlingConnection = false
		} else {
			httpRequestBuffer += string(b)
		}

		for isHandlingConnection && len(httpRequestBuffer) > 0 {
			splition := strings.SplitN(httpRequestBuffer, "\r\n", 2)
			if len(splition) != 2 {
				break
			}

			// Validate the request lines that were read
			line := strings.TrimSpace(splition[0])
			httpRequestBuffer = splition[1]

			if len(line) > 0 {
				// Update any ongoing requests
				if !currentHttpRequest.IsInitialLine {
					initialLineParts := regexp.MustCompile(`\s+`).Split(line, 4)
					if len(initialLineParts) == 3 {
						currentHttpRequest.Method = initialLineParts[0]
						currentHttpRequest.URL = initialLineParts[1]
						currentHttpRequest.Version = initialLineParts[2]

						currentHttpRequest.IsInitialLine = true
					} else {
						/// Bad initial line
						hs.handleBadRequest(conn)
						isHandlingConnection = false
					}
				} else {
					keyValueParts := regexp.MustCompile(`:\s*`).Split(line, 2)
					if len(keyValueParts) == 2 {
						// HTTP key is case insensitive
						key := strings.ToLower(keyValueParts[0])
						value := keyValueParts[1]

						switch key {
						case "connection":
							currentHttpRequest.Connection = strings.TrimSpace(value)
						case "host":
							currentHttpRequest.Host = value
						default:
							// ignore valid but unknown key
						}
					} else {
						// Bad key-value line
						hs.handleBadRequest(conn)
						isHandlingConnection = false
					}
				}
			} else {
				// End of request, handle complete requests
				hs.handleResponse(&currentHttpRequest, conn)
				currentHttpRequest = NewHttpRequestHeader()
			}
		}
	}
}

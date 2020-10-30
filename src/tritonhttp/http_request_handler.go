package tritonhttp

import (
	"bufio"
	"fmt"
	"log"
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

	httpRequestBuffer := []byte{}
	currentHttpRequest := NewHttpRequestHeader()

	// Start a loop for reading requests continuously
	for {
		// Set a timeout for read operation
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))

		// Read from the connection socket into a buffer
		if b, err := reader.ReadByte(); err != nil {
			// Reaching the end of the input or an error
			log.Println("Connection err:", err)
			break
		} else if len(httpRequestBuffer) > 2048 {
			// Bad request
			hs.handleBadRequest(conn)
			break
		} else {
			httpRequestBuffer = append(httpRequestBuffer, b)
		}

		L := len(httpRequestBuffer)
		if L >= 2 && httpRequestBuffer[L-2] == '\r' && httpRequestBuffer[L-1] == '\n' {
			// Validate the request lines that were read
			line := string(httpRequestBuffer[:L-2])
			httpRequestBuffer = httpRequestBuffer[:0]
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

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

	connReceiveBuffer := []byte{}
	currentHttpRequest := NewHttpRequestHeader()

	// Start a loop for reading requests continuously
	for {
		// Set a timeout for read operation
		if err := conn.SetReadDeadline(time.Now().Add(5 * time.Second)); err != nil {
			break
		}

		// Read from the connection socket into a buffer
		if b, err := reader.ReadByte(); err != nil {
			// Reaching the end of the input or an error
			if err, ok := err.(net.Error); ok && err.Timeout() && (len(connReceiveBuffer) > 0 || currentHttpRequest.IsInitialLine) {
				// Read timeout occurs and client has sent part of a request
				// Should reply 400 client error
				hs.handleBadRequest(conn)
			}
			log.Println("Connection err:", err)
			break
		} else if len(connReceiveBuffer) > 2048 {
			// Request too large, reply 400 error
			hs.handleBadRequest(conn)
			break
		} else {
			connReceiveBuffer = append(connReceiveBuffer, b)
		}

		L := len(connReceiveBuffer)
		if L >= 2 && connReceiveBuffer[L-2] == '\r' && connReceiveBuffer[L-1] == '\n' {
			// Validate the request lines that were read
			line := string(connReceiveBuffer[:L-2])
			connReceiveBuffer = connReceiveBuffer[:0]
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
				if currentHttpRequest.IsConnectionClose() {
					conn.Close()
				}
				currentHttpRequest = NewHttpRequestHeader()
			}
		}
	}
}

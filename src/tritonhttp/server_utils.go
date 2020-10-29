package tritonhttp

import (
	"io/ioutil"
	"strings"
)

/**
	Load and parse the mime.types file
**/
func ParseMIME(MIMEPath string) (MIMEMap map[string]string, err error) {
	MIMEMap = make(map[string]string)

	fileContent, err := ioutil.ReadFile(MIMEPath)
	if err != nil {
		return MIMEMap, err
	}

	fileContentString := string(fileContent)
	for _, line := range strings.Split(fileContentString, "\n") {
		line = strings.TrimSpace(line)
		if len(line) > 0 {
			lineParts := strings.Split(line, " ")
			suffix := strings.TrimSpace(lineParts[0])
			mimeType := strings.TrimSpace(lineParts[1])
			MIMEMap[suffix] = mimeType
		}
	}

	return MIMEMap, err
}

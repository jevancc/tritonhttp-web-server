const net = require('net');

class TritonHTTPTestClient {
  constructor(config = {}, handlers = {}) {
    const {
      ip = 'localhost',
      port = 8080,
    } = config;

    const {
      timeoutHandler = () => { },
      endHandler = () => { },
      closeHandler = () => { },
    } = handlers;

    this.ip = ip;
    this.port = port;
    this.socket = new net.Socket();

    this.databuf = Buffer.from('');
    this.ready = false;

    this.socket.on('ready', () => this.ready = true);
    this.socket.on('data', (buf) => this.databuf = Buffer.concat([this.databuf, buf]));
    this.socket.on('timeout', timeoutHandler);
    this.socket.on('end', endHandler);
    this.socket.on('close', closeHandler);
  }

  connect() {
    return new Promise((resolve) => this.socket.connect(this.port, this.ip, () => resolve()));
  }

  send(data) {
    this.socket.write(data);
  }

  sendHttpGet(file, headers) {
    const data = [
      `GET ${file.trim()} HTTP/1.1`,
      ...Object.entries(headers).map(([key, value]) => `${key.trim()}: ${value.trim()}`),
    ].join('\r\n') + '\r\n\r\n';

    this.send(data);
  }


  nextHttpHeaderInitialLine() {
    const buf = this.databuf;

    for (let i = 0; i < Math.min(buf.length - 1, 256); i++) {
      if (buf[i] == 0xD && buf[i + 1] == 0xA /* \r\n */) {
        const header = buf.slice(0, i).toString();
        this.databuf = buf.slice(i + 2);

        const headerParts = header.match(/^(?<version>[^\s]+)\s+(?<code>[^\s]+)\s+(?<description>.*)$/i)?.groups;
        if (!headerParts) {
          throw new Error(`InvalidData: cannot parse header "${header}"`);
        }

        return headerParts;
      }
    }

    throw new Error('InvalidData: no "\\r\\n" found in the response');
  }

  nextHttpHeaderKeyValue() {
    const buf = this.databuf;

    if (buf.length >= 2 && buf[0] == 0xD && buf[1] == 0xA) {
      /* empty line with <CR><LF> only */
      this.databuf = this.databuf.slice(2);
      return null;
    } else {
      for (let i = 0; i < Math.min(buf.length - 1, 256); i++) {
        if (buf[i] == 0xD && buf[i + 1] == 0xA /* \r\n */) {
          const keyValueStr = buf.slice(0, i).toString();
          this.databuf = buf.slice(i + 2);

          const keyValue = keyValueStr.match(/^(?<key>[^\s]+):\s*(?<value>.+)$/i)?.groups;
          if (!keyValue) {
            throw new Error(`InvalidData: cannot parse key-value "${keyValueStr}"`);
          }

          return keyValue;
        }
      }
      throw new Error('InvalidData: no "\\r\\n" found in the response');
    }
  }

  nextHttpHeader() {
    const initialLine = this.nextHttpHeaderInitialLine();
    const keyValues = {};
    while (true) {
      const keyValue = this.nextHttpHeaderKeyValue();
      if (keyValue) {
        const {key, value} = keyValue;
        keyValues[key] = value;
      } else {
        break;
      }
    }

    const header = {...initialLine, keyValues};
    return header;
  }

  nextHttpResponse() {
    const header = this.nextHttpHeader();
    if (header.keyValues['Content-Length']) {
      const contentLength = parseInt(header.keyValues['Content-Length']);
      if (this.databuf.length >= contentLength) {
        const body = this.databuf.slice(0, contentLength);
        this.databuf = this.databuf.slice(contentLength);

        return {header, body};
      } else {
        throw new Error('InvalidData: buffer does not have expected content length');
      }
    } else {
      throw new Error('InvalidData: "Coutent-Length" not found in header');
    }
  }

  close() {
    this.socket.destroy();
    this.socket.end();
  }
}

module.exports.TritonHTTPTestClient = TritonHTTPTestClient;

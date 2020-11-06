const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, waitForBigResponse, areBuffersEqual, waitForServerTimeout } = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7001;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'),
  'testfile.txt': Buffer.from('This is the testfile!!!'),
  'large.txt': Buffer.alloc(10000000, 'a'),
  'empty.txt': Buffer.from('')
};

let server, createClient;

beforeAll(async () => {
  server = runServer({ port: SERVER_PORT, docMap: DOC_MAP });
  createClient = server.createClient;
  await waitForServerStart();
});

afterAll(() => {
  server.cleanup();
});

test('should connect to server and respond nothing when sending nothing.', async () => {
  const client = createClient();
  await client.connect();

  expect(client.isReady).toBeTruthy();
});


test('should respond correct HTTP version in header.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.version).toBe('HTTP/1.1');
});

test('should respond 200 when file exists.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.code).toBe('200');
  expect(header.description).toBe('OK');
});

test('should respond 404 when file does not exist.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/NOT_EXIST.TXT', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.code).toBe('404');
  expect(header.description).toBe('Not Found');
});

test('should respond 400 when Host is not presented in request.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/', { Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.code).toBe('400');
  expect(header.description).toBe('Bad Request');
});

test('should respond file content with correct content length when file exists.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const response = client.nextHttpResponse();
  expect(response.header.code).toBe('200');
  expect(response.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response.body, DOC_MAP['testfile.txt'])).toBeTruthy();
});

test('should respond file content with correct content length when requesting an empty file', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/empty.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const response = client.nextHttpResponse();
  expect(response.header.code).toBe('200');
  expect(response.header.keyValues['Content-Length']).toBe(DOC_MAP['empty.txt'].length.toString());
  expect(areBuffersEqual(response.body, DOC_MAP['empty.txt'])).toBeTruthy();
});

test('should respond file content with correct content length when requesting a large file.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/large.txt', { Host: 'localhost', Connection: 'close' });
  await waitForBigResponse();

  const response = client.nextHttpResponse();
  expect(response.header.code).toBe('200');
  expect(response.header.keyValues['Content-Length']).toBe(DOC_MAP['large.txt'].length.toString());
  expect(areBuffersEqual(response.body, DOC_MAP['large.txt'])).toBeTruthy();
});

test('should respond the existed file content with correct content when sending large request header.', async () => {
  const client = createClient();
  await client.connect();
  const headerKeyValues = {
    Host: 'localhost',
  };
  for (let i = 0; i < 1000; i++) {
    headerKeyValues[`KEY_${i}`] = `VALUE_${i}`;
  }

  client.sendHttpGet('/testfile.txt', headerKeyValues);
  await waitForBigResponse();

  const response = client.nextHttpResponse();
  expect(response.header.code).toBe('200');
  expect(response.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response.body, DOC_MAP['testfile.txt'])).toBeTruthy();
});

describe('Bad Request', () => {

  test('should respond 400 when missing slash in URL.', async () => {
    const client = createClient();
    await client.connect();

    client.sendHttpGet('testfile.txt', { Host: 'localhost', Connection: 'close' });

    await waitForResponse();
    const response = client.nextHttpResponse();

    expect(response.header.code).toBe('400');
    expect(response.header.description).toBe('Bad Request');
  });

  test('should respond 400 when sending unspported HTTP version.', async () => {
    // HTTP version other than 1.1
    const client = createClient();
    await client.connect();

    client.sendHttpGet_adj('GET', '/', { Host: 'localhost', Connection: 'close' }, 'HTTP/1.0');
    await waitForResponse();

    const response = client.nextHttpResponse();
    expect(response.header.code).toBe('400');
    expect(response.header.description).toBe('Bad Request');
  });

  test('should respond 400 when sending unsupported request format.', async () => {

    // methods other than GET
    const client = createClient();
    await client.connect();

    client.sendHttpGet_adj('POST', '/', { Host: 'localhost', Connection: 'close' }, 'HTTP/1.1');
    await waitForResponse();

    const response = client.nextHttpResponse();
    expect(response.header.code).toBe('400');
    expect(response.header.description).toBe('Bad Request');
  });

  test('should respond 400 when sending empty request', async () => {
    // send empty format
    const client = createClient();
    await client.connect();
    client.send('\r\n');
    await waitForResponse();

    const response = client.nextHttpResponse();
    expect(response.header.code).toBe('400');
    expect(response.header.description).toBe('Bad Request');
  });

});


test('should respond 400 and close connection when sending partial request.', async () => {
  const client = createClient();
  await client.connect();

  client.sendPartialGet('/testfile.txt', { Host: 'localhost' });
  await waitForServerTimeout();

  const response = client.nextHttpResponse();
  expect(response.header.code).toBe('400');

  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy()
});

test('should end connection when the client close connection.', async () => {
  // HTTP version other than 1.1
  const client = createClient();
  await client.connect();

  client.close();
  await client.connect();

  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy()
});

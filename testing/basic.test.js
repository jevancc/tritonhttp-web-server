const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual } = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7001;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'),
  'testfile.txt': Buffer.from('This is the testfile!!!'),
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

test('should connect to server.', async () => {
  const client = createClient();
  await client.connect();
  expect(client.ready).toBeTruthy();
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

test('should respond 400 when Host is not presented request.', async () => {
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

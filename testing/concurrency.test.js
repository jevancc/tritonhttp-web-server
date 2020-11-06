const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual, waitForNextRequest, waitForServerTimeout } = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7004;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'),
  'testfile.txt': Buffer.from('This is the testfile!!!'),
  'long.txt': Buffer.alloc(1000000, 'a'),
  'short.txt': Buffer.from('.')
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

test('should respond 200 and same modified time from different clients.', async () => {
  const client1 = createClient();
  const client2 = createClient();
  const client3 = createClient();
  const client4 = createClient();

  await client1.connect();
  await client2.connect();
  await client3.connect();
  await client4.connect();

  client1.sendHttpGet('/index.html', { Host: 'localhost', Connection: 'close' });
  client2.sendHttpGet('/long.txt', { Host: 'localhost', Connection: 'close' });
  client3.sendHttpGet('/short.txt', { Host: 'localhost', Connection: 'close' });
  client4.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const response1 = client1.nextHttpResponse();
  const response2 = client2.nextHttpResponse();
  const response3 = client3.nextHttpResponse();
  const response4 = client4.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  expect(response2.header.code).toBe('200');
  expect(response3.header.code).toBe('200');
  expect(response4.header.code).toBe('200');
  expect(response1.header.keyValues['Last-Modified']).toBe(response2.header.keyValues['Last-Modified']);
  expect(response2.header.keyValues['Last-Modified']).toBe(response3.header.keyValues['Last-Modified']);
  expect(response3.header.keyValues['Last-Modified']).toBe(response4.header.keyValues['Last-Modified']);
});

test('should respond 400 and close connections when there is malformed request', async () => {
  const client1 = createClient();
  const client2 = createClient();
  const client3 = createClient();
  const client4 = createClient();
  await client1.connect();
  await client2.connect();
  await client3.connect();
  await client4.connect();


  client1.sendHttpGet('/index.html', { Host: 'localhost', Connection: 'close' });
  client2.sendHttpGet('long.txt', { Host: 'localhost', Connection: 'close' });
  client3.sendHttpGet('short.txt', { Host: 'localhost', Connection: 'close' });
  client4.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const response1 = client1.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  // expect(response.header.keyValues['Last-Modified']).toBe(response1.header.keyValues['Last-Modified']);

  const response2 = client2.nextHttpResponse();
  expect(response2.header.code).toBe('400');
  expect(client2.isClosed).toBeTruthy();

  const response3 = client3.nextHttpResponse();
  expect(response3.header.code).toBe('400');
  expect(client3.isClosed).toBeTruthy();

  const response4 = client4.nextHttpResponse();
  expect(response4.header.code).toBe('200');
});

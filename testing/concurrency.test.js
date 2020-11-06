const { runServer } = require('./libs/server');
const {
  is200ResponseWithExpectedContentTypeAndBody,
  is400Response,
  is404Response,
  waitForBigResponse,
  waitForServerStart,
  waitForServerTimeout,
  waitForResponse,
  waitForNextRequest,
} = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7004;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'),
  'testfile.txt': Buffer.from('This is the testfile!!!'),
  'long.txt': Buffer.alloc(1000000, 'a'),
  'short.txt': Buffer.from('.'),
};

let server;
let createClient;

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

  client1.sendHttpGet('/index.html', {
    Host: 'localhost',
    Connection: 'close',
  });
  client2.sendHttpGet('/long.txt', { Host: 'localhost', Connection: 'close' });
  client3.sendHttpGet('/short.txt', { Host: 'localhost' });
  client4.sendHttpGet('/testfile.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const response1 = client1.nextHttpResponse();
  const response2 = client2.nextHttpResponse();
  const response3 = client3.nextHttpResponse();
  const response4 = client4.nextHttpResponse();

  expect(is200ResponseWithExpectedContentTypeAndBody(response1, 'text/html', DOC_MAP['index.html'], true)).toBeTruthy();
  expect(is200ResponseWithExpectedContentTypeAndBody(response2, 'text/plain', DOC_MAP['long.txt'], true)).toBeTruthy();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response3, 'text/plain', DOC_MAP['short.txt'], false)
  ).toBeTruthy();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response4, 'text/plain', DOC_MAP['testfile.txt'], true)
  ).toBeTruthy();

  expect(client1.isClosed).toBeTruthy();
  expect(client1.isBufferEmpty()).toBeTruthy();
  expect(client2.isClosed).toBeTruthy();
  expect(client2.isBufferEmpty()).toBeTruthy();
  expect(client3.isClosed).not.toBeTruthy();
  expect(client3.isBufferEmpty()).toBeTruthy();
  expect(client4.isClosed).toBeTruthy();
  expect(client4.isBufferEmpty()).toBeTruthy();
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

  client1.sendHttpGet('/index.html', {
    Host: 'localhost',
    Connection: 'close',
  });
  client2.sendHttpGet('long.txt', { Host: 'localhost', Connection: 'close' });
  client3.sendHttpGet('short.txt', { Host: 'localhost', Connection: 'close' });
  client4.sendHttpGet('/testfile.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const response1 = client1.nextHttpResponse();
  expect(is200ResponseWithExpectedContentTypeAndBody(response1, 'text/html', DOC_MAP['index.html'], true)).toBeTruthy();
  expect(client1.isClosed).toBeTruthy();
  expect(client1.isBufferEmpty()).toBeTruthy();

  const response2 = client2.nextHttpResponse();
  expect(is400Response(response2)).toBeTruthy();
  expect(client2.isClosed).toBeTruthy();
  expect(client2.isBufferEmpty()).toBeTruthy();

  const response3 = client3.nextHttpResponse();
  expect(is400Response(response3)).toBeTruthy();
  expect(client3.isClosed).toBeTruthy();
  expect(client3.isBufferEmpty()).toBeTruthy();

  const response4 = client4.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response4, 'text/plain', DOC_MAP['testfile.txt'], true)
  ).toBeTruthy();
  expect(client4.isClosed).toBeTruthy();
  expect(client4.isBufferEmpty()).toBeTruthy();
});

const { runServer } = require('./libs/server');
const {
  is200ResponseWithExpectedContentTypeAndBody,
  is400Response,
  is404Response,
  areBuffersEqual,
  waitForBigResponse,
  waitForServerStart,
  waitForServerTimeout,
  waitForResponse,
  waitForNextRequest,
} = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7005;
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

afterAll(async () => {
  await server.cleanup();
});

test('should respond correct content when client sends multiple requests and closes connection after timeout', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  await waitForResponse();
  const response1 = client.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response1, 'text/plain', DOC_MAP['testfile.txt'], false)
  ).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/index.html', { Host: 'localhost' });
  await waitForResponse();
  const response2 = client.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response2, 'text/html', DOC_MAP['index.html'], false)
  ).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/long.txt', { Host: 'localhost' });
  await waitForResponse();
  const response3 = client.nextHttpResponse();
  expect(is200ResponseWithExpectedContentTypeAndBody(response3, 'text/plain', DOC_MAP['long.txt'], false)).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/short.txt', { Host: 'localhost' });
  await waitForResponse();
  const response4 = client.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response4, 'text/plain', DOC_MAP['short.txt'], false)
  ).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  await waitForServerTimeout();
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

test('should respond 404 when file does not exist', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  await waitForResponse();
  const response1 = client.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response1, 'text/plain', DOC_MAP['testfile.txt'], false)
  ).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/???.html', { Host: 'localhost' });
  await waitForResponse();
  const response2 = client.nextHttpResponse();
  expect(is404Response(response2, false));
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/???.txt', { Host: 'localhost' });
  await waitForResponse();
  const response3 = client.nextHttpResponse();
  expect(is404Response(response3, false));
  expect(client.isClosed).not.toBeTruthy();

  client.sendHttpGet('/short.txt', { Host: 'localhost' });
  await waitForResponse();
  const response4 = client.nextHttpResponse();
  expect(
    is200ResponseWithExpectedContentTypeAndBody(response4, 'text/plain', DOC_MAP['short.txt'], false)
  ).toBeTruthy();
  expect(client.isClosed).not.toBeTruthy();

  await waitForServerTimeout();
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

test('should close connection when the second request is malformed ', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  client.sendHttpGet('/index.html', {});
  await waitForResponse();

  const response1 = client.nextHttpResponse();
  const response2 = client.nextHttpResponse();

  expect(
    is200ResponseWithExpectedContentTypeAndBody(response1, 'text/plain', DOC_MAP['testfile.txt'], false)
  ).toBeTruthy();
  expect(is400Response(response2)).toBeTruthy();
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

test('should close connection when the request is malformed and not process the next request', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  client.sendHttpGet('/index.html', {});
  await waitForResponse();

  const response1 = client.nextHttpResponse();
  const response2 = client.nextHttpResponse();

  expect(
    is200ResponseWithExpectedContentTypeAndBody(response1, 'text/plain', DOC_MAP['testfile.txt'], false)
  ).toBeTruthy();
  expect(is400Response(response2)).toBeTruthy();
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();

  client.sendHttpGet('/short.txt', { Host: 'localhost' });
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

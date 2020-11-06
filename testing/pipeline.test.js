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

afterAll(() => {
  server.cleanup();
});

test('should respond correct content when a client send multiple requests and close connection after timeout', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  await waitForResponse();
  const response1 = client.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  expect(response1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response1.body, DOC_MAP['testfile.txt'])).toBeTruthy();

  client.sendHttpGet('/index.html', { Host: 'localhost' });
  await waitForResponse();
  const response2 = client.nextHttpResponse();
  expect(response2.header.code).toBe('200');
  expect(response2.header.keyValues['Content-Length']).toBe(DOC_MAP['index.html'].length.toString());
  expect(areBuffersEqual(response2.body, DOC_MAP['index.html'])).toBeTruthy();

  client.sendHttpGet('/long.txt', { Host: 'localhost' });
  await waitForResponse();
  const response3 = client.nextHttpResponse();
  expect(response3.header.code).toBe('200');
  expect(response3.header.keyValues['Content-Length']).toBe(DOC_MAP['long.txt'].length.toString());
  expect(areBuffersEqual(response3.body, DOC_MAP['long.txt'])).toBeTruthy();

  await waitForNextRequest();

  client.sendHttpGet('/short.txt', { Host: 'localhost' });
  await waitForResponse();
  const response4 = client.nextHttpResponse();
  expect(response4.header.code).toBe('200');
  expect(response4.header.keyValues['Content-Length']).toBe(DOC_MAP['short.txt'].length.toString());
  expect(areBuffersEqual(response4.body, DOC_MAP['short.txt'])).toBeTruthy();

  client.sendHttpGet('/???.txt', { Host: 'localhost' });
  await waitForResponse();
  const response5 = client.nextHttpResponse();
  expect(response5.header.code).toBe('404');

  await waitForServerTimeout();
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

test('should respond correct contents and 404 when file does not exist', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  client.sendHttpGet('/index.html', { Host: 'localhost' });
  client.sendHttpGet('/long.txt', { Host: 'localhost' });
  client.sendHttpGet('/short.txt', { Host: 'localhost' });
  client.sendHttpGet('/???.txt', { Host: 'localhost' });
  await waitForResponse();

  const response1 = client.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  expect(response1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response1.body, DOC_MAP['testfile.txt'])).toBeTruthy();

  const response2 = client.nextHttpResponse();
  expect(response2.header.code).toBe('200');
  expect(response2.header.keyValues['Content-Length']).toBe(DOC_MAP['index.html'].length.toString());
  expect(areBuffersEqual(response2.body, DOC_MAP['index.html'])).toBeTruthy();

  const response3 = client.nextHttpResponse();
  expect(response3.header.code).toBe('200');
  expect(response3.header.keyValues['Content-Length']).toBe(DOC_MAP['long.txt'].length.toString());
  expect(areBuffersEqual(response3.body, DOC_MAP['long.txt'])).toBeTruthy();

  const response4 = client.nextHttpResponse();
  expect(response4.header.code).toBe('200');
  expect(response4.header.keyValues['Content-Length']).toBe(DOC_MAP['short.txt'].length.toString());
  expect(areBuffersEqual(response4.body, DOC_MAP['short.txt'])).toBeTruthy();

  const response5 = client.nextHttpResponse();
  expect(response5.header.code).toBe('404');
});

test('should get the first response and close connection when the second request is malformed ', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  await waitForResponse();
  const response1 = client.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  expect(response1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response1.body, DOC_MAP['testfile.txt'])).toBeTruthy();

  client.sendHttpGet('index.html', { Host: 'localhost' });
  await waitForResponse();
  const response2 = client.nextHttpResponse();
  expect(response2.header.code).toBe('400');

  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

test('should close connection when the request is malformed and not process the next request', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/testfile.txt', { Host: 'localhost' });
  await waitForResponse();
  const response1 = client.nextHttpResponse();
  expect(response1.header.code).toBe('200');
  expect(response1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
  expect(areBuffersEqual(response1.body, DOC_MAP['testfile.txt'])).toBeTruthy();

  client.sendHttpGet('index.html', { Host: 'localhost' });
  await waitForResponse();

  const response2 = client.nextHttpResponse();
  expect(response2.header.code).toBe('400');
  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();

  client.sendHttpGet('/index.html', { Host: 'localhost' });
  await waitForResponse();

  expect(client.isClosed).toBeTruthy();
  expect(client.isBufferEmpty()).toBeTruthy();
});

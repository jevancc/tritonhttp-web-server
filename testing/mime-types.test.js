const path = require('path');
const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual } = require('./libs/utils');
const { mimeTypes } = require('./libs/mime');

jest.setTimeout(100000);

const SERVER_PORT = 7002;
const DOC_MAP = Object.keys(mimeTypes).reduce(
  (docs, ext) => ({
    ...docs,
    [`test${ext}`]: Buffer.from(`This is a ${ext} file`),
  }),
  {
    'test.xxxx': Buffer.from('Unknown ext file'),
  }
);

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

test('should respond with content-type (basic)', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/test.zip', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.keyValues['Content-Type']).toBe('application/zip');
});

test('should responed content-type for unknown file extension.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/test.xxxx', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const header = client.nextHttpHeader();
  expect(header.keyValues['Content-Type']).toBe('application/octet-stream');
});

test('should respond with content-type (pipeline & comprehensive)', async () => {
  const client = createClient();
  await client.connect();

  Object.keys(DOC_MAP).map((file) => client.sendHttpGet(`/${file}`, { Host: 'localhost' }));
  await waitForResponse();
  await waitForResponse();

  Object.entries(DOC_MAP).map(([file, content]) => {
    const fileExt = path.extname(file);
    const fileType = mimeTypes[fileExt] ?? 'application/octet-stream';

    const response = client.nextHttpResponse();
    expect(response.header.keyValues['Content-Type']).toBe(fileType);
    expect(response.header.keyValues['Content-Length']).toBe(content.length.toString());
    expect(areBuffersEqual(response.body, content)).toBeTruthy();
  });
});

const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual } = require('./libs/utils');
const { mimeTypes } = require('./libs/mime');

jest.setTimeout(100000);

const SERVER_PORT = 7002;
const DOC_MAP = Object.keys(mimeTypes).reduce((docs, postfix) => ({
  ...docs,
  [`test${postfix}`]: Buffer.from(`This is a sample of ${postfix} file`),
}), {
  'test.xxxx': Buffer.from('Unknown type file'),
});

let server, createClient;

beforeAll(async () => {
  server = runServer({ port: SERVER_PORT, docMap: DOC_MAP });
  createClient = server.createClient;
  await waitForServerStart();
});

afterAll(() => {
  server.cleanup();
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

test.skip('should respond with content-type (pipeline & comprehensive)', async () => {
  const client = createClient();
  await client.connect();

  Object.keys(DOC_MAP).map(file => client.sendHttpGet(`/${file}`, { Host: 'localhost' }));
  await waitForResponse();

  Object.entries(DOC_MAP).map(([file, content]) => {
    const postfix = '.' + file.split('.')[1];
    const type = mimeTypes[postfix];

    const response = client.nextHttpResponse();
    expect(response.header.keyValues['Content-Type']).toBe(type);
    expect(response.header.keyValues['Content-Length']).toBe(content.length.toString());
    expect(areBuffersEqual(response.body, content)).toBeTruthy();
  });
});



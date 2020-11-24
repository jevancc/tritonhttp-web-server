const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual } = require('./libs/utils');

jest.setTimeout(100000);

const SERVER_PORT = 7003;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'),
  'root.txt': Buffer.from('This is the file1'),
  dir1: {
    'index.html': Buffer.from('Index file of dir1'),
    'file1.txt': Buffer.from('This is the file1'),
    dir11: {
      'file11.txt': Buffer.from('This is the file1'),
    },
    dir12: {
      'file12.txt': Buffer.from('This is the file12'),
    },
  },
  dir2: {
    'file2.txt': Buffer.from('This is the file2'),
  },
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

test('should connect to server.', async () => {
  const client = createClient();
  await client.connect();
  expect(client.isReady).toBeTruthy();
});

test('should respond 200 when file exists.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/root.txt', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const content = DOC_MAP['root.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should respond 200 when file exists in subdir.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/file1.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const content = DOC_MAP['dir1']['file1.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should respond 404 when file does not exists in subdir.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/file100.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const { header } = client.nextHttpResponse();
  expect(header.code).toBe('404');
});

test('should respond 404 when subdir does not exist.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir100', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const { header } = client.nextHttpResponse();
  expect(header.code).toBe('404');
});

test('should redirect to index.html when path is a dir.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const content = DOC_MAP['index.html'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should redirect to subdir/index.html when path is a subdir.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1', { Host: 'localhost', Connection: 'close' });
  await waitForResponse();

  const content = DOC_MAP['dir1']['index.html'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should support relative path.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../root.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const content = DOC_MAP['root.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should support relative path traversal.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../dir2/file2.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const content = DOC_MAP['dir2']['file2.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should support complicated relative path traversal.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../dir2/../dir1/dir11/../dir12/../../root.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const content = DOC_MAP['root.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

test('should respond 404 when path escape document root.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../../', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const { header } = client.nextHttpResponse();
  expect(header.code).toBe('404');
});

test('should respond 404 when path escape document root (escape filesystem root).', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../../../../../../../../../../../../../../../../', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const { header } = client.nextHttpResponse();
  expect(header.code).toBe('404');
});

test('should support escape doc root and traverse back to root.', async () => {
  const client = createClient();
  await client.connect();

  client.sendHttpGet('/dir1/../../SERVER_ROOT/dir1/file1.txt', {
    Host: 'localhost',
    Connection: 'close',
  });
  await waitForResponse();

  const content = DOC_MAP['dir1']['file1.txt'];
  const { header, body } = client.nextHttpResponse();
  expect(header.code).toBe('200');
  expect(areBuffersEqual(body, content)).toBeTruthy();
});

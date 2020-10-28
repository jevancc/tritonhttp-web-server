const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse } = require('./libs/utils');

const SERVER_PORT = 7001;

describe('basic', () => {
  let server, createClient;

  beforeEach(async () => {
    server = runServer({ port: SERVER_PORT });
    createClient = server.createClient;
    await waitForServerStart();
  });

  afterEach(() => {
    server.cleanup();
  });

  test('should respond correct HTTP version in header.', async () => {
    const client = createClient();
    client.connect();
    await waitForResponse();
    expect(client.ready).toBeTruthy();

    client.sendHttpGet('/', { Host: 'localhost', Connection: 'close' });
    await waitForResponse();

    const header = client.nextHttpHeader();
    expect(header.version).toBe('HTTP/1.1');
  });

  test('should respond 200 when file exists.', async () => {
    const client = createClient();
    client.connect();
    await waitForResponse();
    expect(client.ready).toBeTruthy();

    client.sendHttpGet('/UCSD_Seal.png', { Host: 'localhost', Connection: 'close' });
    await waitForResponse();

    const header = client.nextHttpHeader();
    expect(header.code).toBe('200');
    expect(header.description).toBe('OK');
  });

  test('should respond 404 when file does not exist.', async () => {
    const client = createClient();
    client.connect();
    await waitForResponse();
    expect(client.ready).toBeTruthy();

    client.sendHttpGet('/NOT_EXIST.TXT', { Host: 'localhost', Connection: 'close' });
    await waitForResponse();

    const header = client.nextHttpHeader();
    expect(header.code).toBe('404');
    expect(header.description).toBe('Not Found');
  });

  test('should respond 400 when Host is not presented request.', async () => {
    const client = createClient();
    client.connect();
    await waitForResponse();
    expect(client.ready).toBeTruthy();

    client.sendHttpGet('/', { Connection: 'close' });
    await waitForResponse();

    const header = client.nextHttpHeader();
    expect(header.code).toBe('400');
    expect(header.description).toBe('Bad Request: missing required Host header');
  });
});

const { runServer } = require('./libs/server');
const { waitForServerStart, waitForResponse, areBuffersEqual, waitForNextRequest, waitForServerTimeout } = require('./libs/utils');
function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(() => resolve(), milliseconds));
}
jest.setTimeout(100000);

const SERVER_PORT = 7001;
const DOC_MAP = {
  'index.html': Buffer.from('Hello World'), 
  'testfile.txt': Buffer.from('This is the testfile!!!'),
  'long.txt': Buffer.alloc(10, 'a'),
  'short.txt': Buffer.from('.')
};
// copy here
let server, createClient;

beforeAll(async () => { // start server
  server = runServer({ port: SERVER_PORT, docMap: DOC_MAP });
  createClient = server.createClient;
  await waitForServerStart();
});
//
afterAll(() => { // end server
  server.cleanup();
});



describe('concurrency', () => {
  test('should respond 200 and same modified time from different clients.', async () => {
    const client = createClient();
    const client1 = createClient();
    const client2 = createClient();
    const client3 = createClient();
    await client.connect();
    await client1.connect();
    await client2.connect();
    await client3.connect();
  
  
    client.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
    client1.sendHttpGet('/index.html', { Host: 'localhost', Connection: 'close' });
    client2.sendHttpGet('/long.txt', { Host: 'localhost', Connection: 'close' });
    client3.sendHttpGet('/short.txt', { Host: 'localhost', Connection: 'close' });
    await waitForResponse();
  
    const response = client.nextHttpResponse();
    const res1 = client1.nextHttpResponse();
    const res2 = client2.nextHttpResponse();
    const res3 = client3.nextHttpResponse();
    expect(response.header.code).toBe('200');
    expect(res1.header.code).toBe('200');
    expect(res2.header.code).toBe('200');
    expect(res3.header.code).toBe('200');
    expect(response.header.keyValues['Last-Modified']).toBe(res1.header.keyValues['Last-Modified']);
    expect(res2.header.keyValues['Last-Modified']).toBe(res3.header.keyValues['Last-Modified']);
    expect(res1.header.keyValues['Last-Modified']).toBe(res3.header.keyValues['Last-Modified']);
  
  
  });
  
  test('should respond 400 and close connections when there is malformed request', async () => {
    const client = createClient();
    const client1 = createClient();
    const client2 = createClient();
    const client3 = createClient();
    await client.connect();
    await client1.connect();
    await client2.connect();
    await client3.connect();
  
  
    client.sendHttpGet('/testfile.txt', { Host: 'localhost', Connection: 'close' });
    client1.sendHttpGet('/index.html', { Host: 'localhost', Connection: 'close' });
    client2.sendHttpGet('long.txt', { Host: 'localhost', Connection: 'close' });
    client3.sendHttpGet('short.txt', { Host: 'localhost', Connection: 'close' });
    await waitForResponse();
  
    const response = client.nextHttpResponse();
    expect(response.header.code).toBe('200');
  
    const res1 = client1.nextHttpResponse();
    expect(res1.header.code).toBe('200');
    expect(response.header.keyValues['Last-Modified']).toBe(res1.header.keyValues['Last-Modified']);
  
    const res2 = client2.nextHttpResponse();
    expect(res2.header.code).toBe('400');
    expect(client2.isclosed).toBeTruthy();
  
    const res3 = client3.nextHttpResponse();
    expect(res3.header.code).toBe('400');
    expect(client3.isclosed).toBeTruthy();
  
  });
});


describe('pipeline', () => {
  test('should respond correct content when a client send multiple requests and close connection after timeout', async () => {
    const client = createClient();
    await client.connect();
    
    client.sendHttpGet('/testfile.txt', { Host: 'localhost'});
    await waitForResponse();
    const res1 = client.nextHttpResponse();
    expect(res1.header.code).toBe('200');
    expect(res1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
    expect(areBuffersEqual(res1.body, DOC_MAP['testfile.txt'])).toBeTruthy();
    
    client.sendHttpGet('/index.html', { Host: 'localhost'});
    await waitForResponse();
    const res2 = client.nextHttpResponse();
    expect(res2.header.code).toBe('200');
    expect(res2.header.keyValues['Content-Length']).toBe(DOC_MAP['index.html'].length.toString());
    expect(areBuffersEqual(res2.body, DOC_MAP['index.html'])).toBeTruthy();
  
    client.sendHttpGet('/long.txt', { Host: 'localhost'});
    await waitForResponse();
    const res3 = client.nextHttpResponse();
    expect(res3.header.code).toBe('200');
    expect(res3.header.keyValues['Content-Length']).toBe(DOC_MAP['long.txt'].length.toString());
    expect(areBuffersEqual(res3.body, DOC_MAP['long.txt'])).toBeTruthy();
  
    await waitForNextRequest();
    
    client.sendHttpGet('/short.txt', { Host: 'localhost'});
    await waitForResponse();
    const res4 = client.nextHttpResponse();
    expect(res4.header.code).toBe('200');
    expect(res4.header.keyValues['Content-Length']).toBe(DOC_MAP['short.txt'].length.toString());
    expect(areBuffersEqual(res4.body, DOC_MAP['short.txt'])).toBeTruthy();
  
    client.sendHttpGet('/???.txt', { Host: 'localhost'});
    await waitForResponse();
    const res5 = client.nextHttpResponse();
    expect(res5.header.code).toBe('404');
  
    await waitForServerTimeout();
    expect(client.isclosed).toBeTruthy();
    expect(client.isBufferEmpty()).toBeTruthy()
    
  });
  
  test('should respond correct contents and 404 when file does not exist', async () => {
    const client = createClient();
    await client.connect();
    
    client.sendHttpGet('/testfile.txt', { Host: 'localhost'});
    client.sendHttpGet('/index.html', { Host: 'localhost'});
    client.sendHttpGet('/long.txt', { Host: 'localhost'});
    client.sendHttpGet('/short.txt', { Host: 'localhost'});
    client.sendHttpGet('/???.txt', { Host: 'localhost'});
    await waitForResponse();
  
    const res1 = client.nextHttpResponse();
    expect(res1.header.code).toBe('200');
    expect(res1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
    expect(areBuffersEqual(res1.body, DOC_MAP['testfile.txt'])).toBeTruthy();
    
    
    const res2 = client.nextHttpResponse();
    expect(res2.header.code).toBe('200');
    expect(res2.header.keyValues['Content-Length']).toBe(DOC_MAP['index.html'].length.toString());
    expect(areBuffersEqual(res2.body, DOC_MAP['index.html'])).toBeTruthy();
  
    
    const res3 = client.nextHttpResponse();
    expect(res3.header.code).toBe('200');
    expect(res3.header.keyValues['Content-Length']).toBe(DOC_MAP['long.txt'].length.toString());
    expect(areBuffersEqual(res3.body, DOC_MAP['long.txt'])).toBeTruthy();
  
    const res4 = client.nextHttpResponse();
    expect(res4.header.code).toBe('200');
    expect(res4.header.keyValues['Content-Length']).toBe(DOC_MAP['short.txt'].length.toString());
    expect(areBuffersEqual(res4.body, DOC_MAP['short.txt'])).toBeTruthy();
  
    const res5 = client.nextHttpResponse();
    expect(res5.header.code).toBe('404');
  
  });
  test('should get the first response and close connection when the second request is malformed ', async () => {
    const client = createClient();
    await client.connect();
    
    client.sendHttpGet('/testfile.txt', { Host: 'localhost'});
    await waitForResponse();
    const res1 = client.nextHttpResponse();
    expect(res1.header.code).toBe('200');
    expect(res1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
    expect(areBuffersEqual(res1.body, DOC_MAP['testfile.txt'])).toBeTruthy();
    
    client.sendHttpGet('index.html', { Host: 'localhost'});
    await waitForResponse();
    const res2 = client.nextHttpResponse();
    expect(res2.header.code).toBe('400');
  
    expect(client.isclosed).toBeTruthy();
    expect(client.isBufferEmpty()).toBeTruthy()
    
  });

  test('should close connection when the  request is malformed and not process the next request', async () => {
    const client = createClient();
    await client.connect();
    
    client.sendHttpGet('/testfile.txt', { Host: 'localhost'});
    await waitForResponse();
    const res1 = client.nextHttpResponse();
    expect(res1.header.code).toBe('200');
    expect(res1.header.keyValues['Content-Length']).toBe(DOC_MAP['testfile.txt'].length.toString());
    expect(areBuffersEqual(res1.body, DOC_MAP['testfile.txt'])).toBeTruthy();
    
    client.sendHttpGet('index.html', { Host: 'localhost'});
    await waitForResponse();
    const res2 = client.nextHttpResponse();
    expect(res2.header.code).toBe('400');
    expect(client.isclosed).toBeTruthy();
    expect(client.isBufferEmpty()).toBeTruthy()
  
    client.sendHttpGet('/index.html', { Host: 'localhost'});
    await waitForResponse();
    expect(client.isclosed).toBeTruthy();
    expect(client.isBufferEmpty()).toBeTruthy()
    
  });
});





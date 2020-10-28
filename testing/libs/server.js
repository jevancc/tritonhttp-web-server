const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const shell = require('shelljs');
const {TritonHTTPTestClient} = require('./client');

const {testing: defaultTestingConfig} = require('../../package.json');
const defaultDocRoot = path.join(__dirname, '../../', defaultTestingConfig['doc-root']);

function runServer(config = {}) {
  const {
    useDefaultServer = defaultTestingConfig['use-default-server'],
    port = defaultTestingConfig['server-port'],
    docRoot = defaultDocRoot,
    mimeTypes = path.join(__dirname, '../../src/mime.types'),
  } = config;

  const tmpfile = tmp.fileSync({mode: 0o644, prefix: 'triton-http-config', postfix: '.ini'});
  writeServerConfig(tmpfile.name, {useDefaultServer, port, docRoot, mimeTypes});

  const serverProcess = shell.exec(`npm run test:start-server -- ${tmpfile.name}`, {
    cwd: path.join(__dirname, '../../'),
    silent: true,
    async: true,
  });

  const clients = [];
  const createClient = (handlers) => {
    const client = new TritonHTTPTestClient({ip: 'localhost', port}, handlers);
    clients.push(client);
    return client;
  };

  const cleanup = () => {
    serverProcess.kill('SIGKILL');
    tmpfile.removeCallback();
    shell.exec(`fuser -k -n tcp ${port}`, {async: true, silent: true});
    for (const client of clients) {
      client.close();
    }
  };

  return {createClient, cleanup};
}
module.exports.runServer = runServer;

function writeServerConfig(fileName, config = {}) {
  const {
    useDefaultServer,
    port,
    docRoot,
    mimeTypes,
  } = config;

  const configIniConent = [
    `[httpd]`,
    `use_default_server=${useDefaultServer}`,
    `port=${port}`,
    `doc_root=${docRoot}`,
    `mime_types=${mimeTypes}`,
  ].join('\n');

  fs.writeFileSync(fileName, configIniConent);
}

function createTempDir() {
  return new Promise((resolve) => {
    tmp.dir((err, dirPath, cleanupCallback) => {
      if (err) {
        throw err;
      }

      const getTempPath = (fileRelativePath) => path.join(dirPath, fileRelativePath);
      resolve(getTempPath, cleanupCallback);
    });
  });
}

function copyAllFiles(src, dest) {
  shell.cp('-R', src, dest);
}

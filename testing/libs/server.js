const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const shell = require('shelljs');
const fkill = require('fkill');
const { TritonHTTPTestClient } = require('./client');

const { testing: defaultTestingConfig } = require('../../package.json');

function runServer(config = {}) {
  const {
    useDefaultServer = defaultTestingConfig['use-default-server'],
    mimeTypes = path.join(__dirname, '../../src/mime.types'),
    docMap = null,
    port,
    docRoot,
  } = config;

  const docDir = docMap ? createTempDocDir(docMap) : null;
  const configFile = createTempServerConfigFile({
    useDefaultServer,
    port,
    docRoot: docMap ? path.join(docDir.name, './SERVER_ROOT/') : docRoot,
    mimeTypes,
  });

  const serverProcess = shell.exec(`npm run start:test -- ${configFile.name}`, {
    cwd: path.join(__dirname, '../../'),
    silent: true,
    async: true,
  });

  const clients = [];
  const createClient = (handlers) => {
    const client = new TritonHTTPTestClient({ ip: 'localhost', port }, handlers);
    clients.push(client);
    return client;
  };

  const cleanup = async () => {
    await fkill(serverProcess.pid, { silent: true, force: true });
    await fkill(`:${port}`, { silent: true, force: true });

    configFile.removeCallback();
    if (docDir) {
      shell.rm('-rf', path.join(docDir.name, '*'));
      docDir.removeCallback();
    }
    for (const client of clients) {
      client.close();
    }
  };

  return { createClient, cleanup };
}
module.exports.runServer = runServer;

function createTempServerConfigFile(config = {}) {
  const { useDefaultServer, port, docRoot, mimeTypes } = config;

  const configFile = tmp.fileSync({
    discardDescriptor: true,
    mode: 0o644,
    prefix: 'triton-http-test-config',
    postfix: '.ini',
  });

  const configIniConent = [
    `[httpd]`,
    `use_default_server=${useDefaultServer}`,
    `port=${port}`,
    `doc_root=${docRoot}`,
    `mime_types=${mimeTypes}`,
  ].join('\n');

  fs.writeFileSync(configFile.name, configIniConent);
  return configFile;
}

function createTempDocDir(docMap) {
  const dir = tmp.dirSync({
    prefix: 'triton-http-test-docs',
  });
  const getPath = (...prefix) => path.join(dir.name, './SERVER_ROOT/', ...prefix);
  shell.mkdir('-p', getPath('./'));

  const build = (docs, prefix) => {
    for (const [name, content] of Object.entries(docs)) {
      if (content instanceof Buffer || typeof content === 'string') {
        const fileName = getPath(...prefix, name);
        fs.writeFileSync(fileName, content);
      } else {
        shell.mkdir('-p', getPath(...prefix, name));
        build(content, [...prefix, name]);
      }
    }
  };

  build(docMap, []);
  return dir;
}

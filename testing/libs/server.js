const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const shell = require('shelljs');
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
    docRoot: docMap ? docDir.name : docRoot,
    mimeTypes,
  });

  const serverProcess = shell.exec(`npm run test:start-server -- ${configFile.name}`, {
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

  const cleanup = () => {
    serverProcess.kill('SIGKILL');
    configFile.removeCallback();
    if (docDir) {
      shell.rm('-rf', path.join(docDir.name, '*'));
      docDir.removeCallback();
    }
    shell.exec(`fuser -k -n tcp ${port}`, { async: true, silent: true });
    for (const client of clients) {
      client.close();
    }
  };

  return { createClient, cleanup };
}
module.exports.runServer = runServer;

function createTempServerConfigFile(config = {}) {
  const {
    useDefaultServer,
    port,
    docRoot,
    mimeTypes,
  } = config;

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
  const getPath = (...prefix) => path.join(dir.name, ...prefix);

  const build = (docs, prefix) => {
    for (const [name, content] of Object.entries(docs)) {
      if (content instanceof Object) {
        shell.mkdir('-p', getPath(...prefix, name));
        build(content, [...prefix, name]);
      } else {
        const fileName = getPath(...prefix, name);
        fs.writeFileSync(fileName, content);
      }
    }
  };

  build(docMap, []);
  return dir;
}

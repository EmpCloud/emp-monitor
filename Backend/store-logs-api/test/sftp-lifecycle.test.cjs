const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const storage = { host: 'sftp.example.test', port: 22, username: 'test', password: 'test', ftp_path: '/uploads' };
const user = { organization_id: 1, email: 'employee@example.test' };
const file = extension => ({ filename: `local.${extension}`, originalname: `ss_2026-11-11_120000.${extension}`, filepath: `local.${extension}`, uploaded: false });

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Exercise the real services and SFTP utility without booting Nest or contacting storage.
function fixture(hooks = {}) {
  const clients = [];
  const errors = [];
  class Client {
    constructor() { this.connected = false; this.ends = 0; clients.push(this); }
    async connect(options) {
      this.connected = true;
      this.options = options;
      if (hooks.connect) await hooks.connect(this);
    }
    async list() {
      if (!this.connected) throw new Error('list: No SFTP connection available');
      if (hooks.list) await hooks.list(this);
      return [];
    }
    async mkdir() {}
    async put(source, destination) {
      if (hooks.put) await hooks.put(this, source, destination);
      if (!this.connected) throw new Error('_put: Write stream error: No response from server');
    }
    async end() {
      this.ends++;
      this.connected = false;
      if (hooks.end) await hooks.end(this);
    }
  }
  let sftp;
  function load(relative) {
    const filename = path.join(__dirname, '../src/modules/v1/desktop', relative);
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019,
        experimentalDecorators: true, esModuleInterop: true },
    }).outputText, {
      exports, Buffer, process: { env: {} }, console: { log: value => errors.push(value) }, setTimeout: fn => fn(),
      require(name) {
        if (name === 'ssh2-sftp-client') return Client;
        if (name === 'node-cache') return class {};
        if (name === '@nestjs/common') return { Injectable: () => target => target };
        if (name === 'sequelize') return { Sequelize: class {} };
        if (name.endsWith('/logger')) return { Logger: class {
          logger = { info: value => errors.push(value), error: value => errors.push(value) };
        } };
        if (name.endsWith('/SFTP.utils')) return sftp;
        if (name.endsWith('/constants')) return {
          providerCodes: { SFTP: 'SFTP', FTP: 'FTP' },
          mainFolderNames: { screenshots: 'EmpMonitorScreenshots', screenRecords: 'EmpMonitorRecords' },
          localyFolders: { screenshots: 'screenshots', records: 'records' },
        };
        if (name.endsWith('/file.utils')) return {
          saveFiles: async () => {}, deleteFileFromLocal: async () => {},
          deleteFilesFromLocal: async () => {}, checkPathExistence: async () => false,
        };
        if (name.endsWith('/config.js')) return {
          DISABLE_SCREENSHOT_TRACKING: [], DISABLE_SCREEN_RECORD_TRACKING: [],
          SCREEN_RECORDING_FOR_SPECIFIC_USERS: {},
        };
        return {};
      },
    }, { filename });
    return exports;
  }
  sftp = load('utils/SFTP.utils.ts');
  const { ScreenshotService } = load('service/screenshot.service.ts');
  const { ScreenRecordService } = load('service/screen-record.service.ts');
  const responseHelper = { sendResponse: (status, message, error, files) => ({ status, message, error, files }) };
  const redis = { getClient: () => ({ get: async () => JSON.stringify({
    short_code: 'SFTP', organizationproviders: { orgProCreds: { creds: JSON.stringify(storage) } },
  }) }) };
  const screenshot = new ScreenshotService(responseHelper, {}, redis);
  const recording = new ScreenRecordService(responseHelper, {}, redis);
  return {
    clients, errors, SFtpUtils: sftp.SFtpUtils,
    uploadRequest: (kind, files) => ({ screenshot, recording })[kind].upload(files, user, {}),
    upload(kind, files) {
      if (kind === 'screenshot') {
        return screenshot.uploadToCloud(sftp.SFtpUtils, storage, files, user.email, 'SFTP', user);
      }
      return recording.uploadToCloud(sftp.SFtpUtils, storage, files, user.email);
    },
  };
}

test('finishing a screenshot cannot close an overlapping MP4 upload for the same organization', async () => {
  const started = { png: deferred(), mp4: deferred() };
  const finish = { png: deferred(), mp4: deferred() };
  const harness = fixture({ put: async (client, source) => {
    const extension = path.extname(source).slice(1);
    started[extension].resolve();
    await finish[extension].promise;
  } });
  const screenshot = file('png');
  const recording = file('mp4');
  const screenshotUpload = harness.upload('screenshot', [screenshot]);
  await started.png.promise;
  const recordingUpload = harness.upload('recording', [recording]);
  await started.mp4.promise;
  finish.png.resolve();
  await screenshotUpload;
  finish.mp4.resolve();
  await recordingUpload;
  assert.equal(screenshot.uploaded, true);
  assert.equal(recording.uploaded, true, `MP4 transfer was interrupted: ${harness.errors.join('\n')}`);
  assert.equal(harness.clients.length, 2, 'concurrent requests must own separate SFTP clients');
  assert.deepEqual(harness.clients.map(client => client.ends), [1, 1]);
});

for (const kind of ['screenshot', 'recording']) {
  test(`${kind} retries failed files on a fresh connection and skips completed files`, async () => {
    const uploads = [];
    const harness = fixture({
      connect: async () => {
        if (harness.clients.length === 2) assert.equal(harness.clients[0].ends, 1, 'close the first attempt before retrying');
      },
      put: async (client, source) => {
        uploads.push(source);
        if (uploads.length === 2) throw new Error('first attempt failed');
      },
    });
    const first = file(kind === 'screenshot' ? 'png' : 'mp4');
    const second = { ...first, filename: `second-${first.filename}`, filepath: `second-${first.filepath}`,
      originalname: first.originalname.replace('120000', '120001') };
    const result = await harness.uploadRequest(kind, [first, second]);
    assert.equal(result.status, 200);
    assert.deepEqual(Array.from(result.files), [first.filename, second.filename]);
    assert.deepEqual(uploads, [first.filepath, second.filepath, second.filepath]);
    assert.equal(harness.clients.length, 2);
    assert.deepEqual(harness.clients.map(client => client.ends), [1, 1]);
    assert.ok(harness.clients.every(client => !client.connected));
  });

  for (const failure of [null, 'connect', 'list', 'put']) {
    test(`${kind} awaits SFTP cleanup after ${failure || 'successful upload'}`, async () => {
      const end = deferred();
      const harness = fixture({
        ...(failure ? { [failure]: async () => { throw new Error(`${failure} failed`); } } : {}),
        end: () => end.promise,
      });
      const uploadFile = file(kind === 'screenshot' ? 'png' : 'mp4');
      let settled = false;
      const upload = harness.upload(kind, [uploadFile]).then(result => { settled = true; return result; });
      try {
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(settled, false, 'upload must wait for end() to settle');
        assert.equal(harness.clients[0].ends, 1, 'the request must close its own client exactly once');
      } finally {
        end.resolve();
        await upload;
      }
      assert.equal(uploadFile.uploaded, failure === null);
    });
  }

  for (const failUpload of [false, true]) {
    test(`${kind} preserves ${failUpload ? 'failed' : 'successful'} upload status if cleanup rejects`, async () => {
      const harness = fixture({
        put: async () => { if (failUpload) throw new Error('put failed'); },
        end: async () => { throw new Error('end failed'); },
      });
      const uploadFile = file(kind === 'screenshot' ? 'png' : 'mp4');
      const result = await harness.upload(kind, [uploadFile]);
      assert.equal(result[0], uploadFile);
      assert.equal(uploadFile.uploaded, !failUpload);
      assert.equal(harness.clients[0].ends, 1);
    });
  }
}

test('SFTP cleanup is safe before initialization and after closing an existing client', async () => {
  const harness = fixture();
  const provider = new harness.SFtpUtils();
  await provider.closeConnection();
  assert.equal(harness.clients.length, 0);
  await provider.initConnection(storage, user.organization_id);
  await provider.closeConnection();
  await provider.closeConnection();
  assert.equal(harness.clients[0].ends, 1);
});

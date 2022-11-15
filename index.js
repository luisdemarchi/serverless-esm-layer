
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

const zl = require('zip-lib');
const lnk = require('lnk');
const archiver = require('archiver');

class EsmLayer {
  constructor(serverless, cliOptions, { log }) {
    this.serverless = serverless;
    this.log = log;

    this.hooks = {
      'after:package:createDeploymentArtifacts': async () => {
        await this.packageFinalize();
      },
    };
  }

  async packageFinalize() {
    this.log.info('serverless-esm-layer: started');
    const dirPath = path.relative('./', '.serverless');
    const files = await fs.promises.readdir(dirPath);
    const zipFiles = files.filter(el => path.extname(el) === '.zip');
    const tempName = `ServerlessEsmLayer-${Math.random().toString(36).slice(2, 7)}`;
    await fs.promises.mkdtemp(path.join(os.tmpdir(), tempName));
    this.tmpDir = path.join(os.tmpdir(), tempName);

    await Promise.all(
      zipFiles.map(async (fileName) => {
        try {
          this.log.info(`serverless-esm-layer: editing the file ${fileName}`);
          await this.unzip(fileName);
          await this.symlink(fileName);
          return this.zip(fileName);
        } catch(error) {
          this.serverless.classes.Error(`serverless-esm-layer - error: ${error}`);
        }
      })
    );
    this.log.info('serverless-esm-layer: finished');
  }

  fullPath(filename) {
    return path.join(this.tmpDir, filename.slice(0, -4));
  }

  async unzip(filename) {
    await zl.extract(`./.serverless/${filename}`, this.fullPath(filename), {
      overwrite: true,
      symlinkAsFileOnWindows: false
    });
  }

  async symlink(filename) {
    await lnk('/opt/nodejs/node_modules', this.fullPath(filename), { rename: 'node_modules', type: 'symbolic', force: true });
  }

  async zip(filename) {
    const output = fs.createWriteStream(`./.serverless/${filename}`);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    archive.pipe(output);
    archive.glob('**/*',
      {
          cwd: this.fullPath(filename),
          root: false,
          nodir: false,
          nosort: false,
          dot: false,
          follow: false
      }
    );
    await archive.finalize();
  }


  async deleteDirTemp() {
    return fs.promises.rm(this.tmpDir, { recursive: true, force: true });
  }
}

module.exports = EsmLayer;

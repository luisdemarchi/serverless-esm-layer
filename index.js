
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const zl = require('zip-lib');
const lnk = require('lnk');
const archiver = require('archiver');

class EsmLayer {
  constructor(serverless) {
    this.serverless = serverless;

    this.hooks = {
      'after:package:createDeploymentArtifacts': async () => {
        await this.packageFinalize();
      },
    };
  }

  async packageFinalize() {
    this.serverless.cli.log('Making adjustments to work the layer with esm (.mjs)');
    const dirPath = path.relative('./', '.serverless');
    const files = await fs.promises.readdir(dirPath);
    const zipFiles = files.filter(el => path.extname(el) === '.zip');
    const tempName = `ServerlessEsmLayer-${Math.random().toString(36).slice(2, 7)}`;
    await fs.promises.mkdtemp(path.join(os.tmpdir(), tempName));
    this.tmpDir = path.join(os.tmpdir(), tempName);

    for await (const fileName of zipFiles) {
      try {
        await this.unzip(fileName);
        await this.symlink(fileName);
        await this.zip(fileName);
      } catch(error) {
        this.serverless.cli.log(`layer with esm - error: ${error}`);
      }
    }
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

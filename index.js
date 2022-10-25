
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
      'after:package:createDeploymentArtifacts':  () => this.packageFinalize(),
      'after:package:finalize':  () => this.listJSON(),
    };
  }
  async listJSON() {
    const dirPath = path.relative('./', '.serverless');
    const files = await fs.promises.readdir(dirPath);
    const jsonFiles = files.filter(el => path.extname(el) === '.json');

    jsonFiles.forEach(async filename => {
      let rawdata = fs.readFileSync(`./.serverless/${filename}`);
      let data = JSON.parse(rawdata);
      if('Resources' in data) {
        // const lambdasVersion = data.Resources.filter(item => item.Type === 'AWS::Lambda::Version');
        const keys = Object
            .keys(data.Resources)
            .filter(k => k.includes('LambdaVersion'));
        keys.forEach(item => {
          const version = data.Resources[item].Properties;
          console.log(version.FunctionName.Ref, version.CodeSha256);
        });
      }
    });
  }



  async packageFinalize() {
    this.serverless.cli.log('Making adjustments to work the layer with esm (.mjs)');
    const dirPath = path.relative('./', '.serverless');
    const files = await fs.promises.readdir(dirPath);
    const zipFiles = files.filter(el => path.extname(el) === '.zip');
    const tempName = `ServerlessEsmLayer-${Math.random().toString(36).slice(2, 7)}`;
    await fs.promises.mkdtemp(path.join(os.tmpdir(), tempName));
    this.tmpDir = path.join(os.tmpdir(), tempName);

    zipFiles.forEach(async item => {
      try {
        await this.unzip(item);
        await this.symlink(item);
        await this.zip(item);
      } catch(error) {
        this.serverless.cli.log(`layer with esm - error: ${error}`);
      }
    });

    // await this.deleteDirTemp();
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
    await this.getCodeSha256(filename);
  }

  async getCodeSha256(filename) {
    const filePath = `./.serverless/${filename}`;
    const shasum = crypto.createHash('sha256');
    await fs.createReadStream(filePath)
    .on('data', (chunk) => {
        shasum.update(chunk);
    })
    .on('end', () => {
        const sha256 = shasum.digest('base64');
        console.log(filename, '<->', sha256);
    });
  }


  async deleteDirTemp() {
    return fs.promises.rm(this.tmpDir, { recursive: true, force: true });
  }
}

module.exports = EsmLayer;

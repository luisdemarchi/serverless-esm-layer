Serverless plugin to support AWS Layers using ES Module
=============================
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

In early 2022, AWS released ES Module (`ESM .mjs`) support for the the Node.js 14.x Lambda Runtime and surprisingly, ESM support was released without "support" for `AWS Layers`. This plugin fixed the problem.

> Note:
> This plugin was based on the [vibe/aws-esm-layer-support repository](https://github.com/vibe/aws-esm-layer-support) that details the problem and shows the implemented solution.


**Requirements:**
* Serverless *v2.x* or higher.
* AWS provider and nodejs14.x/16.x runtimes

## Setup

 Install via npm:
```
npm install serverless-esm-layer --save-dev
```

* Add the plugin to the `plugins` array in your Serverless `serverless.yml`:

```yml
plugins:
  - serverless-esm-layer
```


All done! When running SLS `deploy` your lambdas will have the correct configuration to work layers with ES Module. No extra configuration is needed.

## Contribute

Help us making this plugin better and future proof.

   * Clone the code
   * Install the dependencies with `npm install`
   * Create a feature branch `git checkout -b new_feature`
   * Lint with standard `npm run lint`
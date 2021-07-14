Package.describe({
  name: 'ostrio:files',
  version: '2.0.1',
  summary: 'Upload files to Meteor application, with 3rd party storage support: AWS:S3, GridFS and other',
  git: 'https://github.com/VeliovGroup/Meteor-Files',
  documentation: 'README.md'
});

Npm.depends({
  'fs-extra': '9.1.0',
  eventemitter3: '4.0.7',
  'abort-controller': '3.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom(['1.9', '2.3']);
  api.use('webapp', 'server');
  api.use(['reactive-var', 'tracker', 'ddp-client'], 'client');
  api.use(['mongo', 'check', 'random', 'ecmascript', 'fetch', 'ostrio:cookies@2.7.0'], ['client', 'server']);
  api.addAssets('worker.min.js', 'client');
  api.mainModule('server.js', 'server');
  api.mainModule('client.js', 'client');
  api.export('FilesCollection');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use(['ecmascript', 'ostrio:files'], ['client', 'server']);
  api.addFiles('tests/helpers.js', ['client', 'server']);
});

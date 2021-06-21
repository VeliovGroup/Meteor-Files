### Use GridFS with `gridfs-stream` as a storage

> :warning: **Deprecation warning:** The `gridfs-stream` [has not been updated in a long time](https://github.com/aheckmann/gridfs-stream) and its implementation relies on the deprecated [`GridStore API`](https://mongodb.github.io/node-mongodb-native/3.6/api/GridStore.html). An alternative is to use the Mongo driver's native `GridFSBucket`, which is also [described in
this wiki](https://github.com/VeliovGroup/Meteor-Files/blob/master/docs/gridfs-bucket-integration.md).

Example below shows how to handle (store, serve, remove) uploaded files via GridFS.

Please note - by default all files will be served with `200` response code, which is fine if you planning to deal only with small files, or not planning to serve files back to users (*use only upload and storage*). For support of `206` partial content see [this article](https://github.com/VeliovGroup/Meteor-Files/blob/master/docs/gridfs-streaming.md).

### Preparation

Firstly you need to install [gridfs-stream](https://github.com/aheckmann/gridfs-stream):

```shell
npm install --save gridfs-stream
```

Or:

```shell
meteor npm install --save gridfs-stream
```

#### Create collection

Create a `FilesCollection` instance:

```javascript
import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

export const Images = new FilesCollection({
  debug: false, // Change to `true` for debugging
  collectionName: 'images',
  allowClientCode: false,
  onBeforeUpload(file) {
    if (file.size <= 10485760 && /png|jpg|jpeg/i.test(file.extension)) return true;
    return 'Please upload image, with size equal or less than 10MB';
  },
});

if (Meteor.isServer) {
  Images.denyClient();
}
```

#### Get required packages and create up gfs instance

Import and set up required variables:

```javascript
import Grid from 'gridfs-stream'; // We'll use this package to work with GridFS
import fs from 'fs';              // Required to read files initially uploaded via Meteor-Files
import { MongoInternals } from 'meteor/mongo';

// Set up gfs instance
let gfs;
if (Meteor.isServer) {
  gfs = Grid(
    MongoInternals.defaultRemoteCollectionDriver().mongo.db,
    MongoInternals.NpmModules.mongodb.module
  );
}
```

#### Store and serve files from GridFS

Add `onAfterUpload` and `interceptDownload` hooks that would move file to GridFS once it's uploaded, and serve file from GridFS on request:

```javascript
  onAfterUpload(image) {
    // Move file to GridFS
    Object.keys(image.versions).forEach(versionName => {
      const metadata = { versionName, imageId: image._id, storedAt: new Date() }; // Optional
      const writeStream = gfs.createWriteStream({ filename: image.name, metadata });

      fs.createReadStream(image.versions[versionName].path).pipe(writeStream);

      writeStream.on('close', Meteor.bindEnvironment(file => {
        const property = `versions.${versionName}.meta.gridFsFileId`;

        // Convert ObjectID to String. Because Meteor (EJSON?) seems to convert it to a
        // LocalCollection.ObjectID, which GFS doesn't understand.
        this.collection.update(image._id, { $set: { [property]: file._id.toString() } });
        this.unlink(this.collection.findOne(image._id), versionName); // Unlink file by version from FS
      }));
    });
  },
  interceptDownload(http, image, versionName) {
    const _id = (image.versions[versionName].meta || {}).gridFsFileId;
    if (_id) {
      const readStream = gfs.createReadStream({ _id });
      readStream.on('error', err => { throw err; });
      readStream.pipe(http.response);
    }
    return Boolean(_id); // Serve file from either GridFS or FS if it wasn't uploaded yet
  }
```

#### Handle removing

From now we can store/serve files to/from GridFS. But what will happen if we decide to
delete an image? An Image document will be deleted, but a GridFS record will stay in db forever!
That's not what we want, right?

So let's fix this by adding `onAfterRemove` hook:

```javascript
  onAfterRemove(images) {
    images.forEach(image => {
      Object.keys(image.versions).forEach(versionName => {
        const _id = (image.versions[versionName].meta || {}).gridFsFileId;
        if (_id) gfs.remove({ _id }, err => { if (err) throw err; });
      });
    });
  }
```

#### Final result

Here's a final code:

```javascript
import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import Grid from 'gridfs-stream';
import { MongoInternals } from 'meteor/mongo';
import fs from 'fs';

let gfs;
if (Meteor.isServer) {
  gfs = Grid(
    MongoInternals.defaultRemoteCollectionDriver().mongo.db,
    MongoInternals.NpmModules.mongodb.module
  );
}

export const Images = new FilesCollection({
  collectionName: 'images',
  allowClientCode: false,
  debug: Meteor.isServer && process.env.NODE_ENV === 'development',
  onBeforeUpload(file) {
    if (file.size <= 10485760 && /png|jpg|jpeg/i.test(file.extension)) return true;
    return 'Please upload image, with size equal or less than 10MB';
  },
  onAfterUpload(image) {
    // Move file to GridFS
    Object.keys(image.versions).forEach(versionName => {
      const metadata = { versionName, imageId: image._id, storedAt: new Date() }; // Optional
      const writeStream = gfs.createWriteStream({ filename: image.name, metadata });

      fs.createReadStream(image.versions[versionName].path).pipe(writeStream);

      writeStream.on('close', Meteor.bindEnvironment(file => {
        const property = `versions.${versionName}.meta.gridFsFileId`;

        // If we store the ObjectID itself, Meteor (EJSON?) seems to convert it to a
        // LocalCollection.ObjectID, which GFS doesn't understand.
        this.collection.update(image._id, { $set: { [property]: file._id.toString() } });
        this.unlink(this.collection.findOne(image._id), versionName); // Unlink files from FS
      }));
    });
  },
  interceptDownload(http, image, versionName) {
    // Serve file from GridFS
    const _id = (image.versions[versionName].meta || {}).gridFsFileId;
    if (_id) {
      const readStream = gfs.createReadStream({ _id });
      readStream.on('error', err => {
        // File not found Error handling without Server Crash
        http.response.statusCode = 404;
        http.response.end('file not found');
        console.log(`chunk of file ${file._id}/${file.name} was not found`);
      });
      http.response.setHeader('Cache-Control', this.cacheControl);
      readStream.pipe(http.response);
    }
    return Boolean(_id); // Serve file from either GridFS or FS if it wasn't uploaded yet
  },
  onAfterRemove(images) {
    // Remove corresponding file from GridFS
    images.forEach(image => {
      Object.keys(image.versions).forEach(versionName => {
        const _id = (image.versions[versionName].meta || {}).gridFsFileId;
        if (_id) gfs.remove({ _id }, err => { if (err) throw err; });
      });
    });
  }
});

if (Meteor.isServer) {
  Images.denyClient();
}
```

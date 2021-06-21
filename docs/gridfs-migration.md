# Migrating files from GridFS between applications

You can share/migrate files between Meteor applications via DDP on a server/database level **without the need for complex setups**.
This is due to the circumstance, that GridFS makes use of a normal Mongo.Collection to store metadata and chunks.

This topic can be of relevance for Services or Microservices, that don't share a database but have to share their data.

## Use Case

Consider two Meteor applications **C (Consumer)** and **P (Provider)** where C wants to synchronize all files from P.
The sync will happen without clients (browsers/devices) being involved and the files and documents won't be mutated.

### Step 1 Provide access to the files

First create three Methods in P that each share one of the three crucial Parts of a `FilesCollection`:

- Sharing the `FilesCollection`'s documents
- Sharing the `fs.files`* metadata for the files' respective subversions
- Sharing the `fs.chunks`* (the actual data) of all stored files and their subversions

*This assumes the [default configuration of your GridFS](https://github.com/VeliovGroup/Meteor-Files/blob/master/docs/gridfs-bucket-integration.md) which is by default using the `db.fs.files` and `db.fs.chunks` collections.*

*For custom configuration you may consult the JS Mongo Native Driver documentation on [GridFSBucket](http://mongodb.github.io/node-mongodb-native/3.6/api/GridFSBucket.html).*

#### P/server/sync.js

```js
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { FilesCollection } from 'meteor/ostrio:files'

const ImageFiles = new FilesCollection({ ... })

const FsFiles = new Mongo.Collection('fs.files')
const FsChunks = new Mongo.Collection('fs.chunks')

function getFilesDocuments () {
  return ImageFiles.collection.find().fetch()
}

function getFilesMetadata () {
  return FsFiles.find().fetch()
}

function getFilesChunks () {
  return FsChunks.find().fetch()
}

Meteor.methods({getFilesDocuments, getFilesMetadata, getFilesChunks})
```

### Step 2 Create collections and sync method in C

#### C/server/sync.js

```js
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { DDP } from 'meteor/ddp-client'
import { Tracker } from 'meteor/tracker'
import { FilesCollection } from 'meteor/ostrio:files'

const ImageFiles = new FilesCollection({ ... })
const FsFiles = new Mongo.Collection('fs.files')
const FsChunks = new Mongo.Collection('fs.chunks')

let remoteConnection // use to connect to P via DDP

/**
 * Inserts a doc into a collection or updates the doc, if it already exists
 */
function insertUpdate(collection, doc) {
  if (!collection.findOne(doc._id)) {
    console.log(`[${collection._name}]: insert ${collection.insert(doc)}`)
  } else {
    const docId = doc._id
    delete doc._id
    const updated = collection.update(docId, { $set: doc })
    console.log(`[${collection._name}]: update ${docId} ${updated}`)
  }
}

/**
 * Call the methods on the remote application and insert/update the received documents
 */
function synchronize (trackerComputation) {
  // skip if not yet connected
  if (!remoteConnection.status().connected) return
  
  remoteConnection.call('getFilesDocuments', (err, filesDocuments) => {
    // handle err
    filesDocuments.forEach(filesDoc => insertUpdate(ImageFiles.collection, filesDoc))
  })
  
  remoteConnection.call('getFilesMetadata', (err, filesMetdadata) => {
    // handle err
    filesMetdadata.forEach(metadataDoc => insertUpdate(FsFiles, metadataDoc))
  })

  remoteConnection.call('getFilesChunks', (err, filesChunks) => {
    // handle err
    filesChunks.forEach(chunkDoc => insertUpdate(FsChunks, chunkDoc))
  })

  // stop the tracker because we don't need to watch the connection anymore
  trackerComputation.stop()
}

// ... code continues in the next step
```

### Step 3 Create a remote DDP connection and run the sync

In your Consumer application C you can now connect to the remote app on the server-side.

#### C/server/sync.js (continued)

```javascript
Meteor.startup(() => {
  const url = 'p.domain.tld' // get url of P, for example via process.env or Meteor.settings
  remoteConnection = DDP.connect(url)

  // use Tracker to run the sync when the remoteConnection is "connected"
  const synchronizeTracker = Meteor.bindEnvironment(synchronize)
  Tracker.autorun(synchronizeTracker)
})

```

### Further considerations

You may require authentication for the remote connection, which can be added using [`ongoworks:ddp-login`](https://github.com/reactioncommerce/meteor-ddp-login).
A good pattern is to create a user that is only permitted to run the sync methods in P and login with that user from C. The credentials for login can be passed using `process.env` or `Meteor.settings`.

From this point you can configure your methods to sync only a subset of documents or manipulate them before/after sync or remove them after sync.

import { Meteor } from 'meteor/meteor';

/*
 * @private
 * @locus Anywhere
 * @class FileCursor
 * @param _fileRef    {Object} - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
 * @param _collection {FilesCollection} - FilesCollection Instance
 * @summary Internal class, represents each record in `FilesCursor.each()` or document returned from `.findOne()` method
 */
export class FileCursor {
  constructor(_fileRef, _collection) {
    _fileRef.public = _collection.public;
    this._fileRef    = _fileRef;
    this._collection = _collection;
    Object.assign(this, _fileRef);
  }

  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name remove
   * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed
   * @summary Remove document
   * @returns {FileCursor}
   */
  remove(callback) {
    this._collection._debug('[FilesCollection] [FileCursor] [remove()]');
    if (this._fileRef) {
      this._collection.remove(this._fileRef._id, callback);
    } else {
      callback && callback(new Meteor.Error(404, 'No such file'));
    }
    return this;
  }

  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name link
   * @param version {String} - Name of file's subversion
   * @param URIBase {String} - [Optional] URI base, see - https://github.com/VeliovGroup/Meteor-Files/issues/626
   * @summary Returns downloadable URL to File
   * @returns {String}
   */
  link(version = 'original', URIBase) {
    this._collection._debug(`[FilesCollection] [FileCursor] [link(${version})]`);
    if (this._fileRef) {
      return this._collection.link(this._fileRef, version, URIBase);
    }
    return '';
  }

  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name get
   * @param property {String} - Name of sub-object property
   * @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
   * @returns {Object|mix}
   */
  get(property) {
    this._collection._debug(`[FilesCollection] [FileCursor] [get(${property})]`);
    if (property) {
      return this._fileRef[property];
    }
    return this._fileRef;
  }

  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name fetch
   * @summary Returns document as plain Object in Array
   * @returns {[Object]}
   */
  fetch() {
    this._collection._debug('[FilesCollection] [FileCursor] [fetch()]');
    return [this._fileRef];
  }

  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name with
   * @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
   * @returns {[Object]}
   */
  with() {
    this._collection._debug('[FilesCollection] [FileCursor] [with()]');
    return Object.assign(this, this._collection.collection.findOne(this._fileRef._id));
  }
}

/*
 * @private
 * @locus Anywhere
 * @class FilesCursor
 * @param _selector   {String|Object}   - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
 * @param options     {Object}          - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#selectors)
 * @param _collection {FilesCollection} - FilesCollection Instance
 * @summary Implementation of Cursor for FilesCollection
 */
export class FilesCursor {
  constructor(_selector = {}, options, _collection) {
    this._collection = _collection;
    this._selector   = _selector;
    this._current    = -1;
    this.cursor      = this._collection.collection.find(this._selector, options);
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name get
   * @summary Returns all matching document(s) as an Array. Alias of `.fetch()`
   * @returns {[Object]}
   */
  get() {
    this._collection._debug('[FilesCollection] [FilesCursor] [get()]');
    return this.cursor.fetch();
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name hasNext
   * @summary Returns `true` if there is next item available on Cursor
   * @returns {Boolean}
   */
  hasNext() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasNext()]');
    return this._current < (this.cursor.count() - 1);
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name next
   * @summary Returns next item on Cursor, if available
   * @returns {Object|undefined}
   */
  next() {
    this._collection._debug('[FilesCollection] [FilesCursor] [next()]');
    this.cursor.fetch()[++this._current];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name hasPrevious
   * @summary Returns `true` if there is previous item available on Cursor
   * @returns {Boolean}
   */
  hasPrevious() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasPrevious()]');
    return this._current !== -1;
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name previous
   * @summary Returns previous item on Cursor, if available
   * @returns {Object|undefined}
   */
  previous() {
    this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');
    this.cursor.fetch()[--this._current];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name fetch
   * @summary Returns all matching document(s) as an Array.
   * @returns {[Object]}
   */
  fetch() {
    this._collection._debug('[FilesCollection] [FilesCursor] [fetch()]');
    return this.cursor.fetch() || [];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name first
   * @summary Returns first item on Cursor, if available
   * @returns {Object|undefined}
   */
  first() {
    this._collection._debug('[FilesCollection] [FilesCursor] [first()]');
    this._current = 0;
    return this.fetch()[this._current];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name last
   * @summary Returns last item on Cursor, if available
   * @returns {Object|undefined}
   */
  last() {
    this._collection._debug('[FilesCollection] [FilesCursor] [last()]');
    this._current = this.count() - 1;
    return this.fetch()[this._current];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name count
   * @summary Returns the number of documents that match a query
   * @returns {Number}
   */
  count() {
    this._collection._debug('[FilesCollection] [FilesCursor] [count()]');
    return this.cursor.count();
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name remove
   * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed
   * @summary Removes all documents that match a query
   * @returns {FilesCursor}
   */
  remove(callback) {
    this._collection._debug('[FilesCollection] [FilesCursor] [remove()]');
    this._collection.remove(this._selector, callback);
    return this;
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name forEach
   * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
   * @param context {Object} - An object which will be the value of `this` inside `callback`
   * @summary Call `callback` once for each matching document, sequentially and synchronously.
   * @returns {undefined}
   */
  forEach(callback, context = {}) {
    this._collection._debug('[FilesCollection] [FilesCursor] [forEach()]');
    this.cursor.forEach(callback, context);
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name each
   * @summary Returns an Array of FileCursor made for each document on current cursor
   *          Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper
   * @returns {[FileCursor]}
   */
  each() {
    return this.map((file) => {
      return new FileCursor(file, this._collection);
    });
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name map
   * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
   * @param context {Object} - An object which will be the value of `this` inside `callback`
   * @summary Map `callback` over all matching documents. Returns an Array.
   * @returns {Array}
   */
  map(callback, context = {}) {
    this._collection._debug('[FilesCollection] [FilesCursor] [map()]');
    return this.cursor.map(callback, context);
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name current
   * @summary Returns current item on Cursor, if available
   * @returns {Object|undefined}
   */
  current() {
    this._collection._debug('[FilesCollection] [FilesCursor] [current()]');
    if (this._current < 0) {
      this._current = 0;
    }
    return this.fetch()[this._current];
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name observe
   * @param callbacks {Object} - Functions to call to deliver the result set as it changes
   * @summary Watch a query. Receive callbacks as the result set changes.
   * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe
   * @returns {Object} - live query handle
   */
  observe(callbacks) {
    this._collection._debug('[FilesCollection] [FilesCursor] [observe()]');
    return this.cursor.observe(callbacks);
  }

  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name observeChanges
   * @param callbacks {Object} - Functions to call to deliver the result set as it changes
   * @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
   * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges
   * @returns {Object} - live query handle
   */
  observeChanges(callbacks) {
    this._collection._debug('[FilesCollection] [FilesCursor] [observeChanges()]');
    return this.cursor.observeChanges(callbacks);
  }
}

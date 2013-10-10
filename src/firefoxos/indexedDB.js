/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var FILE_STORE_ = "cordovadrive",
    DIR_SEPARATOR = '/',
    DIR_OPEN_BOUND = String.fromCharCode(DIR_SEPARATOR.charCodeAt(0) + 1);

/**
 * IndexedDB Wrapper
 *
 */
module.exports = {
    db: null,

    open: function(dbName, win, fail) {
        var self = this,
            version = 1;

        // TODO: FF 12.0a1 isn't liking a db name with : in it.
        var request = indexedDB.open(dbName.replace(':', '_'), version);

        request.onerror = fail;

        request.onupgradeneeded = function(e) {
            // First open was called or higher db version was used.

            //console.log('onupgradeneeded: oldVersion:' + e.oldVersion,
            //          'newVersion:' + e.newVersion);
            
            self.db = e.target.result;
            self.db.onerror = fail;

            if (!self.db.objectStoreNames.contains(FILE_STORE_)) {
                var store = self.db.createObjectStore(FILE_STORE_,{/*keyPath: 'id',*/autoIncrement: true});
            }
        };

        request.onsuccess = function(e) {
            self.db = e.target.result;
            self.db.onerror = fail;
            win(e);
        };
       
        request.onblocked = fail;
    },

    close: function() {
        this.db.close();
        this.db = null;
    },

    // TODO: figure out if we should ever call this method. The filesystem API
    // doesn't allow you to delete a filesystem once it is 'created'. Users should
    // use the public remove/removeRecursively API instead.
    drop: function(win, fail) {
        if (!this.db) {
            return;
        }

        var dbName = this.db.name;

        var request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = function(e) {
            win(e);
        };
        request.onerror = fail;

        storage.close();
    },

    get: function(fullPath, win, fail) {
        if (!this.db) {
            return;
        }

        var tx = this.db.transaction([FILE_STORE_], 'readonly'),
            range = IDBKeyRange.bound(fullPath, fullPath + DIR_OPEN_BOUND, false, true),
            request = tx.objectStore(FILE_STORE_).get(range);

        tx.onabort = fail;
        tx.oncomplete = function(e) {
            win(request.result);
        };
    },

    getAllEntries: function(fullPath, win, fail) {
        if (!this.db) {
            return;
        }

        var results = [],
            range = null;

        // Treat the root entry special. Querying it returns all entries because
        // they match '/'.
        if (fullPath != DIR_SEPARATOR) {
            range = IDBKeyRange.bound(fullPath + DIR_SEPARATOR, fullPath + DIR_OPEN_BOUND, false, true);
        }

        var tx = this.db.transaction([FILE_STORE_], 'readonly');
        tx.onabort = fail;
        tx.oncomplete = function(e) {
            // TODO: figure out how to do be range queries instead of filtering result
            // in memory :(
            results = results.filter(function(val) {
              var valPartsLen = val.fullPath.split(DIR_SEPARATOR).length;
              var fullPathPartsLen = fullPath.split(DIR_SEPARATOR).length;
              
              if (fullPath == DIR_SEPARATOR && valPartsLen < fullPathPartsLen + 1) {
                  // Hack to filter out entries in the root folder. This is inefficient
                  // because reading the entires of fs.root (e.g. '/') returns ALL
                  // results in the database, then filters out the entries not in '/'.
                  return val;
              } else if (fullPath != DIR_SEPARATOR &&
                         valPartsLen == fullPathPartsLen + 1) {
                  // If this a subfolder and entry is a direct child, include it in
                  // the results. Otherwise, it's not an entry of this folder.
                  return val;
              }
            });

            win(results);
        };

        var request = tx.objectStore(FILE_STORE_).openCursor(range);

        request.onsuccess = function(e) {
            var cursor = e.target.result;
            if (cursor) {
                var val = cursor.value;

                if ( val.isFile ) {
                    entry = new FileEntry(val.name, val.fullPath);
                    entry.file_ = val.file_;
                } else {
                    entry = new DirectoryEntry(val.name, val.fullPath);
                }

                results.push(entry);
                cursor.continue();
            }
        };
    },

    delete: function(fullPath, win, fail) {
        if (!this.db) {
            return;
        }

        var tx = this.db.transaction([FILE_STORE_], 'readwrite');
        tx.oncomplete = win;
        tx.onabort = fail;

        var range = IDBKeyRange.bound(fullPath, fullPath + DIR_OPEN_BOUND, false, true),
            request = tx.objectStore(FILE_STORE_).delete(range);
    },

    put: function(entry, win, fail) {
        if (!this.db) {
            return;
        }

        var tx = this.db.transaction([FILE_STORE_], 'readwrite');
        tx.onabort = fail;
        tx.oncomplete = function(e) {
            // TODO: Error is thrown if we pass the request event back instead.
            win(entry);
        };

        tx.objectStore(FILE_STORE_).put(entry, entry.fullPath);
    }
};


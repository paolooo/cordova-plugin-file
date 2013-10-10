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

var cordova = require('cordova'),
    Entry = require('./Entry'),
    Metadata = require('./Metadata'),
    DIR_SEPARATOR = '/';


/**
 * Look up the metadata of the entry.
 *
 * @param win {Function} is called with a Metadata object
 * @param fail {Function} is called with a FileError
 */
Entry.prototype.getMetadata = function(win, fail) {
    if (this.isFile) {
        return { "status": cordova.callbackStatus.OK, "message": new Metadata(this.file_.lastModifiedDate, this.file_.size) }
    } else {
        return { "status": cordova.callbackStatus.INVALID_ACTION, "message": "getMetadata() not implemented for DirectoryEntry" }
    }
};

/**
 * Remove a file or directory. It is an error to attempt to delete a
 * directory that is not empty. It is an error to attempt to delete a
 * root directory of a file system.
 *
 * @param win {Function} called with no parameters
 * @param fail {Function} called with a FileError
 *
 * @todo localstorage or FileHandle API ---> idb_['delete'].(...)
 */
Entry.prototype.remove = function(win, fail) {
    // TODO: This doesn't protect against directories that have content in it.
    // Should throw an error instead if the dirEntry is not empty.
    storage.iDB.delete(this.fullPath, function() {
        win();
    }, fail);
};

/**
 * Return a URL that can be used to identify this entry.
 *
 * @todo DIR_SEPARATOR to Global access
 */
Entry.prototype.toURL = function() {
    var origin = location.protocol + '//' + location.host;
    return 'filesystem:' + origin + DIR_SEPARATOR + storageType_.toLowerCase() +
           this.fullPath;
};

module.export = Entry;

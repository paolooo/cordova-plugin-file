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

var utils = require('cordova/utils'),
    Entry = require('./Entry'),
    FileWriter = require('org.apache.cordova.file.FxosFileWriter'),
    File = require('org.apache.cordova.file.FxosFile'),
    FileError = require('./FileError');

/**
 * Interface representing a file in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-fileentry-interface
 *
 * @param 
 *
 * @constructor
 * @extends {Entry}
 */
var FileEntry = function (name, fullPath) {
    this.file_ = null;

    Object.defineProperty(this, 'isFile', {
        enumerable: true,
        get: function() {
            return true;
        }
    });

    Object.defineProperty(this, 'isDirectory', {
        enumerable: true,
        get: function() {
            return false;
        }
    });

    if(name && name.file_) {
        // name = fileEntry
        this.file_ = name.file_;
        this.name = name.name;
        this.fullPath = name.fullPath;
        this.filesystem = name.filesystem;
    }

    FileEntry.__super__.constructor.apply(this, [true, false, name, fullPath]);
};

utils.extend(FileEntry, Entry);

FileEntry.prototype.createWriter = function(win, fail) {
    // TODO: figure out if there's a way to dispatch onwrite event as we're writing
    // data to IDB. Right now, we're only calling onwritend/onerror
    // FileEntry.write().
    win(new FileWriter(this));
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} win is called with the new File object
 * @param {Function} fail is called with a FileError
 */
FileEntry.prototype.file = function(win, fail) {
    var error = typeof fail !== 'function' ? null : function(code) {
        fail(new FileError(code));
    };

    if (this.file_ == null) {
        error(FileError.NOT_FOUND_ERR);
        return;
    }

    // If we're returning a zero-length (empty) file, return the fake file obj.
    // Otherwise, return the native File object that we've stashed.
    var file = this.file_.blob_ == null ? this.file_ : this.file_.blob_;
    file.lastModifiedDate = this.file_.lastModifiedDate;

    // Add Blob.slice() to this wrapped object. Currently won't work :(
    /*if (!val.slice) {
      val.slice = Blob.prototype.slice; // Hack to add back in .slice().
    }*/
    win(file);
};

module.exports = FileEntry;


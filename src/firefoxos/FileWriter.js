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

var FileError = require('./FileError'),
    FileWriter = require('./FileWriter'),
    ProgressEvent = require('./ProgressEvent');

/**
 * @constructor
 * @param fileEntry {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(entry) {
    // default is to write at the beginning of the file
    var position_ = 0,
        fileEntry = entry,
        blob_ = fileEntry.file_ ? fileEntry.file_.blob_ : null;

    this.readyState = 0; // EMPTY
    this.error = null;

    Object.defineProperty(this, 'position', {
        get: function() {
            return position_;
        }
    });

    Object.defineProperty(this, 'length', {
        get: function() {
            return blob_ ? blob_.size : 0;
        }
    });

    Object.defineProperty(this, 'blob_', {
        get: function() {
            return blob_;
        },
        set: function(val) {
            blob_ = val;
        }
    });

    Object.defineProperty(this, 'fileEntry', {
        get: function() {
          return fileEntry;
        },
        set: function(val) {
          fileEntry = val;
        } 
    });

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};


/**
 * Writes data to the file
 *
 * @param data text or blob to be written
 */
FileWriter.prototype.write = function(data) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // Call onwritestart if it was defined.
    if (typeof this.onwritestart === "function") {
        this.onwritestart("writestart", {"target": me});
    }

    this.blob_ = new Blob([data], {type: data.type});
 

    // Set the blob we're writing on this file entry so we can recall it later.
    this.fileEntry.file_.blob_ = this.blob_;
    //fileEntry.file_.blob_.lastModifiedDate = data.lastModifiedDate || null;
    this.fileEntry.file_.lastModifiedDate = data.lastModifiedDate || null;

    storage.iDB.put(this.fileEntry, function(entry) {
        // Add size of data written to writer.position.
        me.position += data.size;

        if (this.onwriteend) {
            this.onwriteend(new ProgressEvent('writeend', {'target': this}));
        }
    }.bind(this), this.onerror);
};  

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    if (offset > this.length) {
        offset = this.length;
    }
    if (offset < 0) {
        offset += this.length;
    }
    if (offset < 0) {
        this.position = 0;
    }
};

FileWriter.prototype.truncate = function(size) {
    if (this.blob_) {
        if (size < this.length) {
            this.blob_ = this.blob_.slice(0, size);
        } else {
            this.blob_ = new Blob([this.blob_, new Uint8Array(size - this.length)],
                             {type: this.blob_.type});
        }
    } else {
        this.blob_ = new Blob([]);
    }

    this.position = 0; // truncate from beginning of file.

    this.write(this.blob_); // calls onwritestart and onwriteend.
};

module.exports = FileWriter;


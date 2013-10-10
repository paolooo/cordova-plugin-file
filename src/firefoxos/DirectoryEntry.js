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

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    DirectoryEntry = require('./DirectoryEntry'),
    DirectoryReader = require('org.apache.cordova.file.FxosDirectoryReader'),
    FileEntry = require('org.apache.cordova.file.FxosFileEntry'),
    FileError = require('./FileError'),
    DIR_SEPARATOR = '/';

// When saving an entry, the fullPath should always lead with a slash and never
// end with one (e.g. a directory). Also, resolve '.' and '..' to an absolute
// one. This method ensures path is legit!
var resolveToFullPath_ = function(cwdFullPath, path) {
    var fullPath = path;

    var relativePath = path[0] != DIR_SEPARATOR;
    if (relativePath) {
      fullPath = cwdFullPath;
      if (cwdFullPath != DIR_SEPARATOR) {
        fullPath += DIR_SEPARATOR + path;
      } else {
        fullPath += path;
      }
    }

    // Adjust '..'s by removing parent directories when '..' flows in path.
    var parts = fullPath.split(DIR_SEPARATOR);
    for (var i = 0; i < parts.length; ++i) {
      var part = parts[i];
      if (part == '..') {
        parts[i - 1] = '';
        parts[i] = '';
      }
    }
    fullPath = parts.filter(function(el) {
      return el;
    }).join(DIR_SEPARATOR);

    // Add back in leading slash.
    if (fullPath[0] != DIR_SEPARATOR) {
      fullPath = DIR_SEPARATOR + fullPath;
    } 

    // Replace './' by current dir. ('./one/./two' -> one/two)
    fullPath = fullPath.replace(/\.\//g, DIR_SEPARATOR);

    // Replace '//' with '/'.
    fullPath = fullPath.replace(/\/\//g, DIR_SEPARATOR);

    // Replace '/.' with '/'.
    fullPath = fullPath.replace(/\/\./g, DIR_SEPARATOR);

    // Remove '/' if it appears on the end.
    if (fullPath[fullPath.length - 1] == DIR_SEPARATOR &&
        fullPath != DIR_SEPARATOR) {
      fullPath = fullPath.substring(0, fullPath.length - 1);
    }  

    return fullPath;
      
};

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function() {
    return new DirectoryReader(this.fullPath);
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or exclusively create the directory
 * @param {Function} win is called with the new entry
 * @param {Function} fail is called with a FileError
 */

DirectoryEntry.prototype.getDirectory = function(path, options, win, fail) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getDirectory', arguments);
    var success = win && function(result) {
        var entry = new DirectoryEntry(result.name, result.fullPath);
        win(entry);
    };
    var error = fail && function(code) {
        fail(new FileError(code));
    };

    // Create an absolute path if we were handed a relative one.
    path = resolveToFullPath_(this.fullPath, path);

    storage.iDB.get(path, function(folderEntry) {
        if (!options) {
            options = {};
        }

        if (options.create === true && options.exclusive === true && folderEntry) {
            // If create and exclusive are both true, and the path already exists,
            // getDirectory must fail.
            if (error) {
                error(FileError.INVALID_MODIFICATION_ERR);
                return;
            }
        } else if (options.create === true && !folderEntry) {
            // If create is true, the path doesn't exist, and no other error occurs,
            // getDirectory must create it as a zero-length file and return a corresponding
            // DirectoryEntry.
            var dirEntry = new DirectoryEntry();
            dirEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
            dirEntry.fullPath = path;
            //dirEntry.filesystem = fs_;
        
            storage.iDB.put(dirEntry, success, error);
        } else if (options.create === true && folderEntry) {

            if (folderEntry.isDirectory) {
                // IDB won't save methods, so we need re-create the DirectoryEntry.
                success(new DirectoryEntry(folderEntry));

            } else {
                if (error) {
                    error(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
            }
        } else if ((!options.create || options.create === false) && !folderEntry) {
            // Handle root special. It should always exist.
            if (path == DIR_SEPARATOR) {
                folderEntry = new DirectoryEntry();
                folderEntry.name = '';
                folderEntry.fullPath = DIR_SEPARATOR;
                //folderEntry.filesystem = fs_;
                success(folderEntry);
                return;
            }

            // If create is not true and the path doesn't exist, getDirectory must fail.
            if (error) {
                error(FileError.INVALID_MODIFICATION_ERR);
                return;
            }
        } else if ((!options.create || options.create === false) && folderEntry && folderEntry.isFile) {
            // If create is not true and the path exists, but is a file, getDirectory
            // must fail.
            if (error) {
                error(FileError.INVALID_MODIFICATION_ERR);
                return;
            }
        } else {
            // Otherwise, if no other error occurs, getDirectory must return a
            // DirectoryEntry corresponding to path.
            success(folderEntry);
        } 
    }, error);
 
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or exclusively create the file
 * @param {Function} win is called with the new entry
 * @param {Function} fail is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, win, fail) {
    argscheck.checkArgs('sOFF', 'DirectoryEntry.getFile', arguments);

    var error = fail && function(code) {
        fail(new FileError(code));
    };
   
    // Create an absolute path if we were handed a relative one.
    path = resolveToFullPath_(this.fullPath, path);

    storage.iDB.get(path, function(fileEntry) {
        if (!options) {
            options = {};
        }

        if (options.create === true && options.exclusive === true && fileEntry) {
            // If create and exclusive are both true, and the path already exists,
            // getFile must fail.
            error(FileError.INVALID_MODIFICATION_ERR);
            return;

        } else if (options.create === true && !fileEntry) {
            // If create is true, the path doesn't exist, and no other error occurs,
            // getFile must create it as a zero-length file and return a corresponding
            // FileEntry.
            var fileEntry = new FileEntry();
            fileEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
            fileEntry.fullPath = path;
            fileEntry.file_ = new File(fileEntry.name, fileEntry.fullPath, null, new Date(), 0);

            storage.iDB.put(fileEntry, win, error);

        } else if (options.create === true && fileEntry) {
            if (fileEntry.isFile) {
                // IDB won't save methods, so we need re-create the FileEntry.
                win(new FileEntry(fileEntry));
            } else {
                error(FileError.INVALID_MODIFICATION_ERR);
                return;
            }
        } else if ((!options.create || options.create === false) && !fileEntry) {
            // If create is not true and the path doesn't exist, getFile must fail.
            error(FileError.INVALID_MODIFICATION_ERR);
            return;

        } else if ((!options.create || options.create === false) && fileEntry &&
                   fileEntry.isDirectory) {
            // If create is not true and the path exists, but is a directory, getFile
            // must fail.
            error(FileError.INVALID_MODIFICATION_ERR);
            return;

        } else {
            // Otherwise, if no other error occurs, getFile must return a FileEntry
            // corresponding to path.

            // IDB won't' save methods, so we need re-create the FileEntry.
            win(new FileEntry(fileEntry));
        } 
    }, error);
     
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} win is called with no parameters
 * @param {Function} fail is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(win, fail) {
    argscheck.checkArgs('FF', 'DirectoryEntry.removeRecursively', arguments);
    var fail = fail && function(code) {
        fail(new FileError(code));
    };

    this.remove(win, fail);
};


module.exports = DirectoryEntry;

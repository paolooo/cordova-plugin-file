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
    cordova = require('cordova'),
    DirectoryEntry = require('./DirectoryEntry'),
    FileEntry = require('org.apache.cordova.file.FxosFileEntry'),
    FileError = require('./FileError'),
    DIR_SEPARATOR = '/';

/**
 * Look up file system Entry referred to by local URI.
 *
 * @param {array} uri URI referring to a local file or directory
 * @param win invoked with Entry object corresponding to URI
 * @param fail invoked if error occurs retrieving file system entry
 */
module.exports = function(uri, win, fail) {
    // error callback
    var error = function(error) {
        fail && fail(new FileError(error));
    };
    // sanity check for 'not:valid:filename'
    if(!uri || uri.split(":").length > 2) {
        setTimeout( function() {
            fail(FileError.ENCODING_ERR);
        },0);
        return;
    }
    // if successful, return either a file or directory entry
    var success = function(entry) {
        var result;
        if (entry && win) {
            // create appropriate Entry object
            result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
            win(result);
        }
        else {
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
        }
    };

    // Adjust '..'s by removing parent directories when '..' flows in path.
    var parts = uri.split(DIR_SEPARATOR);
    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];
        if (part == '..') {
            parts[i - 1] = '';
            parts[i] = '';
        }
    }

    uri = parts.filter(function(el) {
        return el;
    }).join(DIR_SEPARATOR);

    // Add back in leading slash.
    if (uri[0] != DIR_SEPARATOR) {
      uri = DIR_SEPARATOR + uri ;
    } 

    // Replace './' by current dir. ('./one/./two' -> one/two)
    uri = uri.replace(/\.\//g, DIR_SEPARATOR);

    // Replace '//' with '/'.
    uri = uri.replace(/\/\//g, DIR_SEPARATOR);

    // Replace '/.' with '/'.
    uri = uri.replace(/\/\./g, DIR_SEPARATOR);

    // Remove '/' if it appears on the end.
    if (uri[uri.length - 1] == DIR_SEPARATOR &&
        uri!= DIR_SEPARATOR) {
        uri = uri.substring(0, uri.length - 1);
    }

    name = uri.split('/').pop();

    // check if name has an extension filename
    // if it's true, then we consider this a file.
    // Otherwise, it is a directory.
    if ( /\.\w{2,4}/.test(name) ) {
        theEntry = {
            isDirectory: false,
            isFile: true,
            name: name,
            fullPath: uri
        };
    } else {
        theEntry = {
            isDirectory: true,
            isFile: false,
            name: name,
            fullPath: uri
        };
    }

    success(theEntry); 
};


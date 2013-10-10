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

var DirectoryEntry = require('org.apache.cordova.file.FxosDirectoryEntry'),
    LocalFileSystem = require('./LocalFileSystem');

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} type Whether the filesystem requested should be persistent, as defined above. Use one of TEMPORARY or PERSISTENT. 
 * {DirectoryEntry} root directory of the file system (readonly)
 */

var FileSystem = function(type, root) {
    storageType_ = type == LocalFileSystem.TEMPORARY ? 'Temporary' : 'Persistent';

    this.name = (location.protocol + location.host).replace(/:/g, '_') + ':' +  storageType_ || null;

    this.root = new DirectoryEntry();
    this.root.fullPath = "/"
    this.root.filesystem = this;
    this.root.name = '';
};

module.exports = FileSystem;


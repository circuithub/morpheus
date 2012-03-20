# Mecha
Copyright (c) 2011 CircuitHub Inc.

### About

A plugable parameteric solid modeller for the WWW.

### Licensing

Mecha is licensed under the permissive [MIT](http://www.opensource.org/licenses/MIT) open source license. Please see 
`LICENSE` for more information.

In addition, the following licenses are used by third party libraries used in
this project:

* [glQuery](https://github.com/glQuery/glQuery) - [CC0 1.0 Universal](http://creativecommons.org/publicdomain/zero/1.0/)
* [glQuery-math](https://github.com/glQuery/glQuery-math) - [CC0 1.0 Universal](http://creativecommons.org/publicdomain/zero/1.0/)
* [SceneJS](http://scenejs.org/) - [MIT license](http://www.opensource.org/licenses/MIT)
* [UglifyJS parse-js](https://github.com/mishoo/UglifyJS/blob/master/lib/parse-js.js) - [Simplified (2-clause) BSD License](http://www.opensource.org/licenses/bsd-license.php)
* [glMatrix](https://github.com/toji/gl-matrix) - [zlib License](http://www.opensource.org/licenses/Zlib)
* [jsandbox](https://github.com/eligrey/jsandbox) - [MIT License](http://www.opensource.org/licenses/MIT)

(These licenses can also be found in the `licenses/` folder)

### Installation

Basic installation using either [npm](http://npmjs.org/) or [cake](http://coffeescript.org/):

<table width="100%"><tr>
  <td>
    You already have npm:
    <pre>> npm install</pre>
  </td>
  <td>
    You already have cake:
    <pre>> cake install</pre>
  </td>
</tr></table>

For everything else, there's cake menu:
  
    > cake
    
    cake build-api            # Build the API module
    cake build-generator      # Build the generator module
    cake build-editor         # Build the editor module
    cake build-renderer       # Build the renderer module
    cake build-gui            # Build the gui module
    cake all                  # Build all distribution files
    cake debug                # Build all distribution files in debug (development) mode
    cake fetch:tools          # Fetch all supporting tools
    cake fetch:npm            # Fetch the npm package manager (always global)
    cake fetch:uglifyjs       # Fetch the UglifyJS minification tool
    cake fetch:express        # Fetch the express server (for running a local server)
    cake fetch:libraries      # Update all supporting libraries
    cake fetch:glquery        # Update the glQuery library (always local)
    cake minify               # Minify the resulting application file after build
    cake clean                # Cleanup all build files and distribution files
    
      -g, --global       Use with fetch to install supporting libraries and tools globally


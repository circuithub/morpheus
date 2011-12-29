fs     = require 'fs'
path   = require 'path'
{exec} = require 'child_process'

###
Files
###

mechaModules = ['mecha','mecha-api', 'mecha-generator', 'mecha-gui', 'mecha-editor']

mechaFiles = [
  'mecha-generator'
  'mecha-editor'
  'mecha-gui'
]

apiFiles = [
  'api/api.csm'
  'api/exports'
]

generatorFiles  = [
  'common/directives'
  'common/array'
  'common/math'
  'common/mecha.log'
  'generator/util.tostring'
  'generator/translate.csm'
  'generator/compile.asm.api'
  'generator/compile.asm.generics'
  'generator/compile.asm.optimize'
  'generator/compile.asm.bounds'
  'generator/compile.asm'
  'generator/compile.glsl.api'
  'generator/compile.glsl.library'
  'generator/compile.glsl.compiler'
  'generator/compile.glsl.compilerDistance'
  'generator/compile.glsl.sceneDistance'
  'generator/compile.glsl.sceneId'
  'generator/compile.glsl'
  'generator/exports'
]

guiFiles  = [
  'common/directives'
  'common/math'
  'common/mecha.log'
  'renderer/scenejs.nodeattr'
  'renderer/scenejs.conversion'
  'renderer/scenejs.orbitlookat'
  'renderer/scenejs.zoomlookat'
  'gui/constants'
  'gui/state'
  'gui/mouse'
  'gui/events.window'
  'gui/events.mouse'
  'gui/events.keyboard'
  'gui/events.controls'
  'gui/events.register'
  'gui/events.idle'
  'gui/events.init'
  'gui/exports'
]

editorFiles = [
  'common/directives'
  'common/mecha.log'
  'editor/translate.sugaredjs'
  'editor/create'
  'editor/exports'
]

###
Generic functions
###

Function.prototype.partial = ->
  fn = this
  args = Array.prototype.slice.call arguments
  -> fn.apply this, (args.concat (Array.prototype.slice.call arguments))

###
Build helpers
###

concatHeader = (filename, module, callback) ->
  fs.readFile "static/lib/#{filename}.js", 'utf8', (err, fileContents) ->
    throw err if err
    fs.readFile "src/common/header.js", 'utf8', (err, commonHeaderContents) ->
      throw err if err
      if module?
        fs.readFile "src/#{module}/header.js", 'utf8', (err, headerContents) ->
          throw err if err
          callback (commonHeaderContents + headerContents + fileContents) if callback?
      else
        callback (commonHeaderContents + fileContents) if callback?

buildText = (filename, module) -> (text) -> (callback) ->
  fs.writeFile "build/#{filename}.coffee", text.join('\n\n'), 'utf8', (err) ->
    throw err if err
    exec "coffee -o static/lib -c build/#{filename}.coffee", (err, stdout, stderr) ->
      throw err if err
      console.log stdout + stderr
      fs.unlink "build/#{filename}.coffee", (err) ->
        throw err if err
        # Concatenate the header file
        concatHeader filename, module, (text) ->
          # Write out the result
          fs.writeFile "static/lib/#{filename}.js", text, 'utf8', (err) ->
            throw err if err
            console.log "...Done (#{filename}.js)"
            callback() if callback?

concatFiles = (files) -> (callback) ->
  contents = new Array files.length
  remaining = files.length
  () ->
    args = arguments
    for file, index in files then do (file, index) ->
      fs.readFile "src/#{file}.coffee", 'utf8', (err, fileContents) ->
        throw err if err
        contents[index] = fileContents
        ((callback contents) args...) if --remaining is 0 and callback?
###
Build scripts
###

buildMecha = -> 
  args = arguments
  ->
    writeJSFile = (filename) -> (text) -> (callback) ->
      fs.writeFile "static/lib/#{filename}.js", text.join('\n\n'), 'utf8', (err) ->
        throw err if err
        console.log "...Done (#{filename}.js)"
        callback() if callback?

    concatJSFiles = (files) -> (callback) ->
      contents = new Array files.length
      remaining = files.length
      () ->
        args = arguments
        for file, index in files then do (file, index) ->
          fs.readFile "static/lib/#{file}.js", 'utf8', (err, fileContents) ->
            throw err if err
            contents[index] = fileContents
            ((callback contents) args...) if --remaining is 0 and callback?

    ((concatJSFiles mechaFiles) (writeJSFile 'mecha')) args...
buildApi = -> 
  args = arguments
  -> ((concatFiles apiFiles) (buildText 'mecha-api', 'api')) args...
buildGenerator = -> 
  args = arguments 
  -> ((concatFiles generatorFiles) (buildText 'mecha-generator', 'generator')) args...
buildGui = -> 
  args = arguments
  -> ((concatFiles guiFiles) (buildText 'mecha-gui', 'gui')) args...
buildEditor = ->
  args = arguments
  -> ((concatFiles editorFiles) (buildText 'mecha-editor', 'editor')) args...
minify = ->
  path.exists 'node_modules/.bin/uglifyjs', (exists) ->
    tool = if exists then 'node_modules/.bin/uglifyjs' else 'uglifyjs'
    for file in mechaModules then do (file) ->
      path.exists "static/lib/#{file}.js", (exists) ->
        if exists
          exec "#{tool} static/lib/#{file}.js > static/lib/#{file}.min.js", (err, stdout, stderr) ->
            throw err if err
            console.log stdout + stderr
            console.log "...Done (#{file}.min.js)"

###
Tasks
###

#task 'build', "Build the entire mecha module", ->
#  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
#  buildMecha()()

task 'build-api', "Build the API module", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  buildApi()()

task 'build-generator', "Build the generator module", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  buildGenerator()()

task 'build-gui', "Build the gui module", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  buildGui()()

task 'build-editor', "Build the editor module", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  buildEditor()()

task 'all', "Build all distribution files", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  (buildApi buildGenerator buildGui buildEditor buildMecha minify)()

task 'fetch:npm', "Fetch the npm package manager", ->
  exec "curl http://npmjs.org/install.sh | sudo sh", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    console.log "Done."

task 'fetch:uglifyjs', "Fetch the UglifyJS minification tool", ->
  exec "npm install uglify-js", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    console.log "Done."

task 'fetch:async', "Fetch the async library", ->
  exec "npm install async", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    console.log "Done."

task 'minify', "Minify the resulting application file after build", ->
  minify()

task 'clean', "Cleanup all build files and distribution files", ->
  exec "rm -rf build"
  remaining = mechaModules.length
  for file in mechaModules
    exec "rm static/lib/#{file}.js", (err, stdout, stderr) ->
      #console.log stdout + stderr
      console.log "...Done (clean)" if --remaining is 0


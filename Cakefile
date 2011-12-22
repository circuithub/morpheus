fs     = require 'fs'
path   = require 'path'
{exec} = require 'child_process'

###
Files
###

mechaFiles  = [
  'common/directives'
  'common/array'
  'common/math'
  'renderer/scenejs.nodeattr'
  'renderer/scenejs.conversion'
  'renderer/scenejs.orbitlookat'
  'renderer/scenejs.zoomlookat'
  'mecha'
  'mecha.log'
  'editor/translate.sugaredjs'
  'generator/util.tostring'
  'generator/compile.csm'
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
  'constants'
  'state'
  'gui/mouse'
  'gui/events.window'
  'gui/events.mouse'
  'gui/events.keyboard'
  'gui/events.controls'
  'gui/events.register'
  'gui/events.idle'
  'gui/events.init'
]

generatorFiles  = [
  'common/directives'
  'common/array'
  'common/math'
  'mecha.log'
  'generator/util.tostring'
  'generator/compile.csm'
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
]

guiFiles  = [
  'common/directives'
  'common/math'
  'renderer/scenejs.nodeattr'
  'renderer/scenejs.conversion'
  'renderer/scenejs.orbitlookat'
  'renderer/scenejs.zoomlookat'
  'mecha.log'
  'gui/mouse'
  'gui/events.window'
  'gui/events.mouse'
  'gui/events.keyboard'
  'gui/events.controls'
  'gui/events.register'
  'gui/events.idle'
  'gui/events.init'
]

editorFiles = [
  'common/directives'
  'mecha.log'
  'editor/translate.sugaredjs'
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

buildText = (filename) -> (text) -> (callback) ->
  fs.writeFile "build/#{filename}.coffee", text.join('\n\n'), 'utf8', (err) ->
    throw err if err
    exec "coffee -o static/lib -c build/#{filename}.coffee", (err, stdout, stderr) ->
      throw err if err
      console.log stdout + stderr
      fs.unlink "build/#{filename}.coffee", (err) ->
        throw err if err
        # Concatenate the header file
        fs.readFile "static/lib/#{filename}.js", 'utf8', (err, appjsContents) ->
          throw err if err
          fs.readFile "src/common/header.js", 'utf8', (err, headerjsContents) ->
            throw err if err
            # Write out the result
            fs.writeFile "static/lib/#{filename}.js", headerjsContents + appjsContents, 'utf8', (err) ->
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
        ((callback contents) args...) if --remaining is 0
###
Build scripts
###

buildMecha = -> 
  args = arguments
  -> ((concatFiles mechaFiles) (buildText 'mecha')) args...
buildGenerator = -> 
  args = arguments 
  -> ((concatFiles generatorFiles) (buildText 'mecha-generator')) args...
buildGui = -> 
  args = arguments
  -> ((concatFiles guiFiles) (buildText 'mecha-gui')) args...
buildEditor = ->
  args = arguments
  -> ((concatFiles editorFiles) (buildText 'mecha-editor')) args...

###
Tasks
###

task 'build', "Build the entire mecha module", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return
  buildMecha()()

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
  (buildMecha buildGenerator buildGui buildEditor())()

#buildApi = (callback) ->
#  # Translate the CSM API separately (compile into a separate file)
#  exec "coffee -o static/lib -c src/api/api.csm.coffee", (err, stdout, stderr) ->
#    throw err if err
#    console.log stdout + stderr
#    # Concatenate the header file
#    fs.readFile 'static/lib/api.csm.js', 'utf8', (err, appjsContents) ->
#      throw err if err
#      fs.readFile 'src/common/header.js', 'utf8', (err, headerjsContents) ->
#        throw err if err
#        # Write out the result
#        fs.writeFile 'static/lib/api.csm.js', headerjsContents + appjsContents, 'utf8', (err) ->
#          throw err if err
#          console.log "...Done (api.csm.js)"
#          callback null, null

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
  path.exists 'node_modules/.bin/uglifyjs', (exists) ->
    if exists
      exec "node_modules/.bin/uglifyjs static/lib/app.js > static/lib/app.min.js", (err, stdout, stderr) ->
        throw err if err
        console.log stdout + stderr
        console.log "...Done (app.min.js)"
      exec "node_modules/.bin/uglifyjs static/lib/api.csm.js > static/lib/api.csm.min.js", (err, stdout, stderr) ->
        throw err if err
        console.log stdout + stderr
        console.log "...Done (api.csm.min.js)"
    else
      exec "uglifyjs static/lib/app.js > static/lib/app.min.js", (err, stdout, stderr) ->
        throw err if err
        console.log stdout + stderr
        console.log "...Done (app.min.js)"
      exec "uglifyjs static/lib/api.csm.js > static/lib/api.csm.min.js", (err, stdout, stderr) ->
        throw err if err
        console.log stdout + stderr
        console.log "...Done (api.csm.min.js)"

task 'clean', "Cleanup all build files and distribution files", ->
  exec "rm -rf build;rm static/lib/app.js;rm static/lib/app.min.js;rm static/lib/api.csm.js;rm static/lib/api.csm.min.js", (err, stdout, stderr) ->
    console.log stdout + stderr
    console.log "...Done (clean)"


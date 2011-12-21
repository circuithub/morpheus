fs     = require 'fs'
path   = require 'path'
{exec} = require 'child_process'
async  = require 'async'

appFiles  = [
  # omit src/ and .coffee to make the below lines a little shorter
  'common/directives'
  'renderer/scenejs.nodeattr'
  'renderer/scenejs.conversion'
  'renderer/scenejs.orbitlookat'
  'renderer/scenejs.zoomlookat'
  'mecha'
  'mecha.log'
  'common/array'
  'common/math'
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
  'mouse'
  'gui/events.window'
  'gui/events.mouse'
  'gui/events.keyboard'
  'gui/events.controls'
  'gui/events.register'
  'gui/events.idle'
  'gui/events.init'
]

###
# See http://stackoverflow.com/questions/4631774/coordinating-parallel-execution-in-node-js
forkJoin = (async_calls, shared_callback) ->
  counter = async_calls.length
  callback = ->
    --counter
    shared_callback() if counter == 0
  async_call callback for async_call in async_calls

Function.prototype.partial = ->
  fn = this
  args = Array.prototype.slice.call arguments
  () -> fn.apply this, args.concat arguments

Function.prototype.chain = ->
  (this.partial arguments) (callback) ->
    callback
###
taskList = []
invokeSeries = (tasks...) ->
  taskList = tasks.slice 1
  invoke tasks[0] if tasks.length > 0
invokeNext = () ->
  invoke taskList.shift() if taskList.length > 0

task 'all', "Build all distribution files", ->
  invokeSeries 'build', 'minify'

task 'build', "Build single application file from source files", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) -> return

  # Translate concatenated file
  process = (appContents, callback) ->
    fs.writeFile 'build/app.coffee', appContents.join('\n\n'), 'utf8', (err) ->
      throw err if err
      exec "coffee -o static/lib -c build/app.coffee", (err, stdout, stderr) ->
        throw err if err
        console.log stdout + stderr
        fs.unlink 'build/app.coffee', (err) ->
          throw err if err
          # Concatenate the header file
          fs.readFile 'static/lib/app.js', 'utf8', (err, appjsContents) ->
            throw err if err
            fs.readFile 'src/common/header.js', 'utf8', (err, headerjsContents) ->
              throw err if err
              # Write out the result
              fs.writeFile 'static/lib/app.js', headerjsContents + appjsContents, 'utf8', (err) ->
                throw err if err
                console.log "...Done (app.js)"
                callback null, null

  # Concatenate files
  async.parallel([
      (callback) ->
        appContents = new Array appFiles.length
        remaining = appFiles.length
        for file, index in appFiles then do (file, index) ->
          fs.readFile "src/#{file}.coffee", 'utf8', (err, fileContents) ->
            throw err if err
            appContents[index] = fileContents
            process(appContents, callback) if --remaining is 0
    ,
      (callback) ->
        # Translate the CSM API separately (compile into a separate file)
        exec "coffee -o static/lib -c src/api/api.csm.coffee", (err, stdout, stderr) ->
          throw err if err
          console.log stdout + stderr
          # Concatenate the header file
          fs.readFile 'static/lib/api.csm.js', 'utf8', (err, appjsContents) ->
            throw err if err
            fs.readFile 'src/common/header.js', 'utf8', (err, headerjsContents) ->
              throw err if err
              # Write out the result
              fs.writeFile 'static/lib/api.csm.js', headerjsContents + appjsContents, 'utf8', (err) ->
                throw err if err
                console.log "...Done (api.csm.js)"
                callback null, null
    ],
    (err, result) -> invokeNext()
  )

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


fs     = require 'fs'
path   = require 'path'
{exec} = require 'child_process'

appFiles  = [
  # omit src/ and .coffee to make the below lines a little shorter
  'scenejs.nodeattr'
  'scenejs.conversion'
  'scenejs.orbitlookat'
  'scenejs.zoomlookat'
  'mecha'
  'mecha.log'
  'array'
  'math'
  'util.tostring'
  #'api.csm'
  'compile.csm'
  'compile.asm.api'
  'compile.asm.generics'
  'compile.asm.optimize'
  'compile.asm.bounds'
  'compile.asm'
  'compile.glsl.library'
  'compile.glsl.compiler'
  'compile.glsl.compilerDistance'
  'compile.glsl.sceneDistance'
  'compile.glsl.sceneId'
  'compile.glsl'
  'constants'
  'state'
  'mouse'
  'events.window'
  'events.mouse'
  'events.keyboard'
  'events.controls'
  'events.register'
  'events.idle'
  'events.init'
]

task 'all', "Build all distribution files", ->
  invoke 'build'
  invoke 'minify'

task 'build', "Build single application file from source files", ->
  exec "mkdir -p 'build'", (err, stdout, stderr) ->
  # Concatenate files
  appContents = new Array remaining = appFiles.length
  for file, index in appFiles then do (file, index) ->
    fs.readFile "src/#{file}.coffee", 'utf8', (err, fileContents) ->
      throw err if err
      appContents[index] = fileContents
      process() if --remaining is 0
  # Translate concatenated file
  process = ->
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
            fs.readFile 'src/header.js', 'utf8', (err, headerjsContents) ->
              throw err if err
              # Write out the result
              fs.writeFile 'static/lib/app.js', headerjsContents + appjsContents, 'utf8', (err) ->
                throw err if err
                console.log "...Done (app.js)"
  # Translate the CSM API separately (compile into a separate file)
  exec "coffee -o static/lib -c src/api.csm.coffee", (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
    # Concatenate the header file
    fs.readFile 'static/lib/api.csm.js', 'utf8', (err, appjsContents) ->
      throw err if err
      fs.readFile 'src/header.js', 'utf8', (err, headerjsContents) ->
        throw err if err
        # Write out the result
        fs.writeFile 'static/lib/api.csm.js', headerjsContents + appjsContents, 'utf8', (err) ->
          throw err if err
          console.log "...Done (api.csm.js)"

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


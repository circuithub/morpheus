/*
 * glQuery - A fluent WebGL engine (https://github.com/glQuery)
 * glQuery is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 */
var glQuery = (function() {
"use strict";

  // Define a local copy of glQuery
  var gl = function(selector) {
    return gl.fn.init(selector);
  },
  debugLevel = 0,
  // The scenes, each of which contains a hierarchy of identifiers
  scenes = {},
  // Commands to be executed
  // TODO: Should commands be associated with a specific scene id?
  commands = [],
  // Commands associated with a tag
  tagCommands = {},
  // Tags for which commands have been dispatched that affect the state hashes
  dirtyTags = [],
  // All shader definitions
  shaders = {},
  // All shader uniform and attribute locations
  shaderLocations = {},
  // Counters for identifiers
  shaderProgramCounter = 0,
  // Event callbacks
  eventFns = { 
    contextlost: [], 
    contextrestored: [], 
    contextcreationerror: [] 
  },
  // Logging / information methods
  logDebug = ((!(debugLevel > 0))? function(){} :
    (debugLevel === 1)? function(msg) { console.debug("glQuery:", msg); } :
    function() { console.debug.apply(console, ["glQuery:"].concat(Array.prototype.slice.call(arguments))); }),
  logInfo = function(msg) { console.log("glQuery:", msg); },
  logWarning = function(msg) { console.warn("glQuery:", msg); },
  logError = function(msg) { console.error("glQuery:", msg); },
  logApiError = function(func,msg) { console.error("glQuery:", "In call to '" + func + "', " + msg); },
  // Run-time checks
  // TODO: Should we provide checks that throw exceptions rather than logging messages?
  assert = function(condition, msg) { if (!condition) logError(msg); return condition; },
  assertType = function(param, typeStr, parentFunction, paramStr) {
    if (paramStr != null && parentFunction != null)
      return assert(typeof param === typeStr, "In call to '" + parentFunction + "', expected type '" + typeStr + "' for '" + paramStr + "'. Instead, got type '" + typeof param + "'.");
    else if (parentFunction != null)
      return assert(typeof param === typeStr, "In call to '" + parentFunction + "', expected type '" + typeStr + "'. Instead, got type '" + typeof param + "'.");
    else if (paramStr != null)
      return assert(typeof param === typeStr, "Expected type '" + typeStr + "' for '" + paramStr + "'. Instead, got type '" + typeof param + "'.");
    else
      return assert(typeof param === typeStr, "Expected type '" + typeStr + "'. Instead, got type '" + typeof param + "'.");
  },
  assertNumberOfArguments = function(args, minNumber, parentFunction) {
    if (parentFunction != null)
      return assert(args.length >= minNumber, "In call to '" + parentFunction + "', expected at least " + minNumber + " arguments. Instead, got " + args.length + ".");
    else
      return assert(args.length >= minNumber, "Expected at least " + minNumber + " arguments. Instead, got " + args.length + ".");
  },
  assertInternal = assert,
  // The last identifer number that was generated automatically
  lastId = 0,
  // Automatically generate a new object identifier
  generateId = function() { var r = '__glq__' + lastId; ++lastId; return r; },
  // Generate a key-value map for the given nodes and id's for anonymous nodes
  normalizeNodes = function(nodes) {
    if (Array.isArray(nodes)) {
      // Automatically generate a parent id and normalize all child nodes
      var resultNodes = [];
      resultNodes.hashes = {};
      resultNodes.lastUpdate = 0;
      for (var i = 0; i < nodes.length; ++i) {
        var resultNode = normalizeNodes(nodes[i])
        if (Array.isArray(nodes)) {
          // Don't nest arrays, generate a new id for the node instead
          var obj = {};
          obj[generateId()] = resultNodes;
          resultNodes.push(obj);
        }
        if (resultNode != null)
          resultNodes.push(resultNode);
        else
          // TODO: In call to either scene or insert....
          logApiError('scene', "could not normalize the node with type '" + (typeof nodes[i]) + "'.");
      }
      return resultNodes;
    }
    switch (typeof nodes) {
      case 'string':
        // Make sure tags have a commands stack associated (so that hashes do not need to be rebuilt when non-hashed commands are added to empty tags)
        var tags = nodes.split(' ');
        for (var i = 0; i < tags.length; ++i)
          if (typeof tagCommands[tags[i]] === 'undefined')
            tagCommands[tags[i]] = new Array(commandEval.length);
        return nodes;
      case 'number':
        var str = String(nodes);
        // Make sure tags have a commands stack associated (so that hashes do not need to be rebuilt when non-hashed commands are added to empty tags)
        if (typeof tagCommands[str] === 'undefined')
          tagCommands[str] = new Array(commandEval.length);
        return str;
      case 'object':
        var result = {};
        // TODO: normalize key-value pairs
        for (var key in nodes) {
          if (key === 'prototype') {
            logError("The given nodes contain a 'prototype' object. ");
            continue;
          }
          normalizeNodes(key);
          var node = normalizeNodes(nodes[key]);
          if (Array.isArray(node))
            result[key] = node;
          else {
            var n = (node != null? [node] : []);
            n.hashes = {};
            n.lastUpdate = 0;
            result[key] = n;
          }
        }
        return result;
    }
  };

  // Cross-browser initialization
  window.requestAnimationFrame = (function(){
    return window.requestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.oRequestAnimationFrame
        || window.msRequestAnimationFrame
        || function(fn, element){ window.setTimeout(fn, 1000 / 60); };
  })();

  window.cancelRequestAnimationFrame = (function(){
    return window.cancelRequestAnimationFrame
        || window.webkitCancelRequestAnimationFrame
        || window.mozCancelRequestAnimationFrame
        || window.oCancelRequestAnimationFrame
        || window.msCancelRequestAnimationFrame
        || window.clearTimeout;
  })();

  var webglTypeSize = [
    1, // BYTE
    1, // UNSIGNED_BYTE
    2, // SHORT
    2, // UNSIGNED_SHORT
    4, // INT
    4, // UNSIGNED_INT
    4  // FLOAT
  ];


  // WebGL constants

  /* Even though any instance of a WebGL context provides these constants, we
     provide static list WebGL constants here directly. These constants are
     taken directly from the WebGL specifications document, so they are
     guaranteed to be correct in every compliant implementation.

     This approach has many advantages:
     * Decouple graphics operations from the context used to draw them
       (For example, we'd like to use these constants in web workers which are
       completely issolated from the WebGL context.)
     * Directly reuse constants from WebGL rather than laboriously maintaining
       shim constants with the exact same functionality.
     * Reuse well-documented constants that are already familiar to all OpenGL
       programmers (principle of least suprise).
     * Easily extend glQuery with new plugins and commands.
     * Provide constants for extensions even when they are not available in the
       implementation. This is far less error-prone than manually checking for
       every constant's existence.
     * Reduce the amount of state that needs to be carried around.
     * Emulating WebGL using a different type of context (e.g. 2d canvas) is
       easier if all the constants are available. WebGL provides what we need
       and we need what WebGL provides.
  */
  
  /* ClearBufferMask */
  gl.DEPTH_BUFFER_BIT               = 0x00000100;
  gl.STENCIL_BUFFER_BIT             = 0x00000400;
  gl.COLOR_BUFFER_BIT               = 0x00004000;
  
  /* BeginMode */
  gl.POINTS                         = 0x0000;
  gl.LINES                          = 0x0001;
  gl.LINE_LOOP                      = 0x0002;
  gl.LINE_STRIP                     = 0x0003;
  gl.TRIANGLES                      = 0x0004;
  gl.TRIANGLE_STRIP                 = 0x0005;
  gl.TRIANGLE_FAN                   = 0x0006;
  
  /* AlphaFunction (not supported in ES20) */
  /*      NEVER */
  /*      LESS */
  /*      EQUAL */
  /*      LEQUAL */
  /*      GREATER */
  /*      NOTEQUAL */
  /*      GEQUAL */
  /*      ALWAYS */
  
  /* BlendingFactorDest */
  gl.ZERO                           = 0;
  gl.ONE                            = 1;
  gl.SRC_COLOR                      = 0x0300;
  gl.ONE_MINUS_SRC_COLOR            = 0x0301;
  gl.SRC_ALPHA                      = 0x0302;
  gl.ONE_MINUS_SRC_ALPHA            = 0x0303;
  gl.DST_ALPHA                      = 0x0304;
  gl.ONE_MINUS_DST_ALPHA            = 0x0305;
  
  /* BlendingFactorSrc */
  /*      ZERO */
  /*      ONE */
  gl.DST_COLOR                      = 0x0306;
  gl.ONE_MINUS_DST_COLOR            = 0x0307;
  gl.SRC_ALPHA_SATURATE             = 0x0308;
  /*      SRC_ALPHA */
  /*      ONE_MINUS_SRC_ALPHA */
  /*      DST_ALPHA */
  /*      ONE_MINUS_DST_ALPHA */
  
  /* BlendEquationSeparate */
  gl.FUNC_ADD                       = 0x8006;
  gl.BLEND_EQUATION                 = 0x8009;
  gl.BLEND_EQUATION_RGB             = 0x8009;   /* same as BLEND_EQUATION */
  gl.BLEND_EQUATION_ALPHA           = 0x883D;
  
  /* BlendSubtract */
  gl.FUNC_SUBTRACT                  = 0x800A;
  gl.FUNC_REVERSE_SUBTRACT          = 0x800B;
  
  /* Separate Blend Functions */
  gl.BLEND_DST_RGB                  = 0x80C8;
  gl.BLEND_SRC_RGB                  = 0x80C9;
  gl.BLEND_DST_ALPHA                = 0x80CA;
  gl.BLEND_SRC_ALPHA                = 0x80CB;
  gl.CONSTANT_COLOR                 = 0x8001;
  gl.ONE_MINUS_CONSTANT_COLOR       = 0x8002;
  gl.CONSTANT_ALPHA                 = 0x8003;
  gl.ONE_MINUS_CONSTANT_ALPHA       = 0x8004;
  gl.BLEND_COLOR                    = 0x8005;
  
  /* Buffer Objects */
  gl.ARRAY_BUFFER                   = 0x8892;
  gl.ELEMENT_ARRAY_BUFFER           = 0x8893;
  gl.ARRAY_BUFFER_BINDING           = 0x8894;
  gl.ELEMENT_ARRAY_BUFFER_BINDING   = 0x8895;
  
  gl.STREAM_DRAW                    = 0x88E0;
  gl.STATIC_DRAW                    = 0x88E4;
  gl.DYNAMIC_DRAW                   = 0x88E8;
  
  gl.BUFFER_SIZE                    = 0x8764;
  gl.BUFFER_USAGE                   = 0x8765;
  
  gl.CURRENT_VERTEX_ATTRIB          = 0x8626;
  
  /* CullFaceMode */
  gl.FRONT                          = 0x0404;
  gl.BACK                           = 0x0405;
  gl.FRONT_AND_BACK                 = 0x0408;
  
  /* DepthFunction */
  /*      NEVER */
  /*      LESS */
  /*      EQUAL */
  /*      LEQUAL */
  /*      GREATER */
  /*      NOTEQUAL */
  /*      GEQUAL */
  /*      ALWAYS */
  
  /* EnableCap */
  /* TEXTURE_2D */
  gl.CULL_FACE                      = 0x0B44;
  gl.BLEND                          = 0x0BE2;
  gl.DITHER                         = 0x0BD0;
  gl.STENCIL_TEST                   = 0x0B90;
  gl.DEPTH_TEST                     = 0x0B71;
  gl.SCISSOR_TEST                   = 0x0C11;
  gl.POLYGON_OFFSET_FILL            = 0x8037;
  gl.SAMPLE_ALPHA_TO_COVERAGE       = 0x809E;
  gl.SAMPLE_COVERAGE                = 0x80A0;
  
  /* ErrorCode */
  gl.NO_ERROR                       = 0;
  gl.INVALID_ENUM                   = 0x0500;
  gl.INVALID_VALUE                  = 0x0501;
  gl.INVALID_OPERATION              = 0x0502;
  gl.OUT_OF_MEMORY                  = 0x0505;
  
  /* FrontFaceDirection */
  gl.CW                             = 0x0900;
  gl.CCW                            = 0x0901;
  
  /* GetPName */
  gl.LINE_WIDTH                     = 0x0B21;
  gl.ALIASED_POINT_SIZE_RANGE       = 0x846D;
  gl.ALIASED_LINE_WIDTH_RANGE       = 0x846E;
  gl.CULL_FACE_MODE                 = 0x0B45;
  gl.FRONT_FACE                     = 0x0B46;
  gl.DEPTH_RANGE                    = 0x0B70;
  gl.DEPTH_WRITEMASK                = 0x0B72;
  gl.DEPTH_CLEAR_VALUE              = 0x0B73;
  gl.DEPTH_FUNC                     = 0x0B74;
  gl.STENCIL_CLEAR_VALUE            = 0x0B91;
  gl.STENCIL_FUNC                   = 0x0B92;
  gl.STENCIL_FAIL                   = 0x0B94;
  gl.STENCIL_PASS_DEPTH_FAIL        = 0x0B95;
  gl.STENCIL_PASS_DEPTH_PASS        = 0x0B96;
  gl.STENCIL_REF                    = 0x0B97;
  gl.STENCIL_VALUE_MASK             = 0x0B93;
  gl.STENCIL_WRITEMASK              = 0x0B98;
  gl.STENCIL_BACK_FUNC              = 0x8800;
  gl.STENCIL_BACK_FAIL              = 0x8801;
  gl.STENCIL_BACK_PASS_DEPTH_FAIL   = 0x8802;
  gl.STENCIL_BACK_PASS_DEPTH_PASS   = 0x8803;
  gl.STENCIL_BACK_REF               = 0x8CA3;
  gl.STENCIL_BACK_VALUE_MASK        = 0x8CA4;
  gl.STENCIL_BACK_WRITEMASK         = 0x8CA5;
  gl.VIEWPORT                       = 0x0BA2;
  gl.SCISSOR_BOX                    = 0x0C10;
  /*      SCISSOR_TEST */
  gl.COLOR_CLEAR_VALUE              = 0x0C22;
  gl.COLOR_WRITEMASK                = 0x0C23;
  gl.UNPACK_ALIGNMENT               = 0x0CF5;
  gl.PACK_ALIGNMENT                 = 0x0D05;
  gl.MAX_TEXTURE_SIZE               = 0x0D33;
  gl.MAX_VIEWPORT_DIMS              = 0x0D3A;
  gl.SUBPIXEL_BITS                  = 0x0D50;
  gl.RED_BITS                       = 0x0D52;
  gl.GREEN_BITS                     = 0x0D53;
  gl.BLUE_BITS                      = 0x0D54;
  gl.ALPHA_BITS                     = 0x0D55;
  gl.DEPTH_BITS                     = 0x0D56;
  gl.STENCIL_BITS                   = 0x0D57;
  gl.POLYGON_OFFSET_UNITS           = 0x2A00;
  /*      POLYGON_OFFSET_FILL */
  gl.POLYGON_OFFSET_FACTOR          = 0x8038;
  gl.TEXTURE_BINDING_2D             = 0x8069;
  gl.SAMPLE_BUFFERS                 = 0x80A8;
  gl.SAMPLES                        = 0x80A9;
  gl.SAMPLE_COVERAGE_VALUE          = 0x80AA;
  gl.SAMPLE_COVERAGE_INVERT         = 0x80AB;
  
  /* GetTextureParameter */
  /*      TEXTURE_MAG_FILTER */
  /*      TEXTURE_MIN_FILTER */
  /*      TEXTURE_WRAP_S */
  /*      TEXTURE_WRAP_T */
  
  gl.NUM_COMPRESSED_TEXTURE_FORMATS = 0x86A2;
  gl.COMPRESSED_TEXTURE_FORMATS     = 0x86A3;
  
  /* HintMode */
  gl.DONT_CARE                      = 0x1100;
  gl.FASTEST                        = 0x1101;
  gl.NICEST                         = 0x1102;
  
  /* HintTarget */
  gl.GENERATE_MIPMAP_HINT            = 0x8192;
  
  /* DataType */
  gl.BYTE                           = 0x1400;
  gl.UNSIGNED_BYTE                  = 0x1401;
  gl.SHORT                          = 0x1402;
  gl.UNSIGNED_SHORT                 = 0x1403;
  gl.INT                            = 0x1404;
  gl.UNSIGNED_INT                   = 0x1405;
  gl.FLOAT                          = 0x1406;
  
  /* PixelFormat */
  gl.DEPTH_COMPONENT                = 0x1902;
  gl.ALPHA                          = 0x1906;
  gl.RGB                            = 0x1907;
  gl.RGBA                           = 0x1908;
  gl.LUMINANCE                      = 0x1909;
  gl.LUMINANCE_ALPHA                = 0x190A;
  
  /* PixelType */
  /*      UNSIGNED_BYTE */
  gl.UNSIGNED_SHORT_4_4_4_4         = 0x8033;
  gl.UNSIGNED_SHORT_5_5_5_1         = 0x8034;
  gl.UNSIGNED_SHORT_5_6_5           = 0x8363;
  
  /* Shaders */
  gl.FRAGMENT_SHADER                  = 0x8B30;
  gl.VERTEX_SHADER                    = 0x8B31;
  gl.MAX_VERTEX_ATTRIBS               = 0x8869;
  gl.MAX_VERTEX_UNIFORM_VECTORS       = 0x8DFB;
  gl.MAX_VARYING_VECTORS              = 0x8DFC;
  gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
  gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS   = 0x8B4C;
  gl.MAX_TEXTURE_IMAGE_UNITS          = 0x8872;
  gl.MAX_FRAGMENT_UNIFORM_VECTORS     = 0x8DFD;
  gl.SHADER_TYPE                      = 0x8B4F;
  gl.DELETE_STATUS                    = 0x8B80;
  gl.LINK_STATUS                      = 0x8B82;
  gl.VALIDATE_STATUS                  = 0x8B83;
  gl.ATTACHED_SHADERS                 = 0x8B85;
  gl.ACTIVE_UNIFORMS                  = 0x8B86;
  gl.ACTIVE_ATTRIBUTES                = 0x8B89;
  gl.SHADING_LANGUAGE_VERSION         = 0x8B8C;
  gl.CURRENT_PROGRAM                  = 0x8B8D;
  
  /* StencilFunction */
  gl.NEVER                          = 0x0200;
  gl.LESS                           = 0x0201;
  gl.EQUAL                          = 0x0202;
  gl.LEQUAL                         = 0x0203;
  gl.GREATER                        = 0x0204;
  gl.NOTEQUAL                       = 0x0205;
  gl.GEQUAL                         = 0x0206;
  gl.ALWAYS                         = 0x0207;
  
  /* StencilOp */
  /*      ZERO */
  gl.KEEP                           = 0x1E00;
  gl.REPLACE                        = 0x1E01;
  gl.INCR                           = 0x1E02;
  gl.DECR                           = 0x1E03;
  gl.INVERT                         = 0x150A;
  gl.INCR_WRAP                      = 0x8507;
  gl.DECR_WRAP                      = 0x8508;
  
  /* StringName */
  gl.VENDOR                         = 0x1F00;
  gl.RENDERER                       = 0x1F01;
  gl.VERSION                        = 0x1F02;
  
  /* TextureMagFilter */
  gl.NEAREST                        = 0x2600;
  gl.LINEAR                         = 0x2601;
  
  /* TextureMinFilter */
  /*      NEAREST */
  /*      LINEAR */
  gl.NEAREST_MIPMAP_NEAREST         = 0x2700;
  gl.LINEAR_MIPMAP_NEAREST          = 0x2701;
  gl.NEAREST_MIPMAP_LINEAR          = 0x2702;
  gl.LINEAR_MIPMAP_LINEAR           = 0x2703;
  
  /* TextureParameterName */
  gl.TEXTURE_MAG_FILTER             = 0x2800;
  gl.TEXTURE_MIN_FILTER             = 0x2801;
  gl.TEXTURE_WRAP_S                 = 0x2802;
  gl.TEXTURE_WRAP_T                 = 0x2803;
  
  /* TextureTarget */
  gl.TEXTURE_2D                     = 0x0DE1;
  gl.TEXTURE                        = 0x1702;
  
  gl.TEXTURE_CUBE_MAP               = 0x8513;
  gl.TEXTURE_BINDING_CUBE_MAP       = 0x8514;
  gl.TEXTURE_CUBE_MAP_POSITIVE_X    = 0x8515;
  gl.TEXTURE_CUBE_MAP_NEGATIVE_X    = 0x8516;
  gl.TEXTURE_CUBE_MAP_POSITIVE_Y    = 0x8517;
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Y    = 0x8518;
  gl.TEXTURE_CUBE_MAP_POSITIVE_Z    = 0x8519;
  gl.TEXTURE_CUBE_MAP_NEGATIVE_Z    = 0x851A;
  gl.MAX_CUBE_MAP_TEXTURE_SIZE      = 0x851C;
  
  /* TextureUnit */
  gl.TEXTURE0                       = 0x84C0;
  gl.TEXTURE1                       = 0x84C1;
  gl.TEXTURE2                       = 0x84C2;
  gl.TEXTURE3                       = 0x84C3;
  gl.TEXTURE4                       = 0x84C4;
  gl.TEXTURE5                       = 0x84C5;
  gl.TEXTURE6                       = 0x84C6;
  gl.TEXTURE7                       = 0x84C7;
  gl.TEXTURE8                       = 0x84C8;
  gl.TEXTURE9                       = 0x84C9;
  gl.TEXTURE10                      = 0x84CA;
  gl.TEXTURE11                      = 0x84CB;
  gl.TEXTURE12                      = 0x84CC;
  gl.TEXTURE13                      = 0x84CD;
  gl.TEXTURE14                      = 0x84CE;
  gl.TEXTURE15                      = 0x84CF;
  gl.TEXTURE16                      = 0x84D0;
  gl.TEXTURE17                      = 0x84D1;
  gl.TEXTURE18                      = 0x84D2;
  gl.TEXTURE19                      = 0x84D3;
  gl.TEXTURE20                      = 0x84D4;
  gl.TEXTURE21                      = 0x84D5;
  gl.TEXTURE22                      = 0x84D6;
  gl.TEXTURE23                      = 0x84D7;
  gl.TEXTURE24                      = 0x84D8;
  gl.TEXTURE25                      = 0x84D9;
  gl.TEXTURE26                      = 0x84DA;
  gl.TEXTURE27                      = 0x84DB;
  gl.TEXTURE28                      = 0x84DC;
  gl.TEXTURE29                      = 0x84DD;
  gl.TEXTURE30                      = 0x84DE;
  gl.TEXTURE31                      = 0x84DF;
  gl.ACTIVE_TEXTURE                 = 0x84E0;
  
  /* TextureWrapMode */
  gl.REPEAT                         = 0x2901;
  gl.CLAMP_TO_EDGE                  = 0x812F;
  gl.MIRRORED_REPEAT                = 0x8370;
  
  /* Uniform Types */
  gl.FLOAT_VEC2                     = 0x8B50;
  gl.FLOAT_VEC3                     = 0x8B51;
  gl.FLOAT_VEC4                     = 0x8B52;
  gl.INT_VEC2                       = 0x8B53;
  gl.INT_VEC3                       = 0x8B54;
  gl.INT_VEC4                       = 0x8B55;
  gl.BOOL                           = 0x8B56;
  gl.BOOL_VEC2                      = 0x8B57;
  gl.BOOL_VEC3                      = 0x8B58;
  gl.BOOL_VEC4                      = 0x8B59;
  gl.FLOAT_MAT2                     = 0x8B5A;
  gl.FLOAT_MAT3                     = 0x8B5B;
  gl.FLOAT_MAT4                     = 0x8B5C;
  gl.SAMPLER_2D                     = 0x8B5E;
  gl.SAMPLER_CUBE                   = 0x8B60;
  
  /* Vertex Arrays */
  gl.VERTEX_ATTRIB_ARRAY_ENABLED        = 0x8622;
  gl.VERTEX_ATTRIB_ARRAY_SIZE           = 0x8623;
  gl.VERTEX_ATTRIB_ARRAY_STRIDE         = 0x8624;
  gl.VERTEX_ATTRIB_ARRAY_TYPE           = 0x8625;
  gl.VERTEX_ATTRIB_ARRAY_NORMALIZED     = 0x886A;
  gl.VERTEX_ATTRIB_ARRAY_POINTER        = 0x8645;
  gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 0x889F;
  
  /* Shader Source */
  gl.COMPILE_STATUS                 = 0x8B81;
  
  /* Shader Precision-Specified Types */
  gl.LOW_FLOAT                      = 0x8DF0;
  gl.MEDIUM_FLOAT                   = 0x8DF1;
  gl.HIGH_FLOAT                     = 0x8DF2;
  gl.LOW_INT                        = 0x8DF3;
  gl.MEDIUM_INT                     = 0x8DF4;
  gl.HIGH_INT                       = 0x8DF5;
  
  /* Framebuffer Object. */
  gl.FRAMEBUFFER                    = 0x8D40;
  gl.RENDERBUFFER                   = 0x8D41;
  
  gl.RGBA4                          = 0x8056;
  gl.RGB5_A1                        = 0x8057;
  gl.RGB565                         = 0x8D62;
  gl.DEPTH_COMPONENT16              = 0x81A5;
  gl.STENCIL_INDEX                  = 0x1901;
  gl.STENCIL_INDEX8                 = 0x8D48;
  gl.DEPTH_STENCIL                  = 0x84F9;
  
  gl.RENDERBUFFER_WIDTH             = 0x8D42;
  gl.RENDERBUFFER_HEIGHT            = 0x8D43;
  gl.RENDERBUFFER_INTERNAL_FORMAT   = 0x8D44;
  gl.RENDERBUFFER_RED_SIZE          = 0x8D50;
  gl.RENDERBUFFER_GREEN_SIZE        = 0x8D51;
  gl.RENDERBUFFER_BLUE_SIZE         = 0x8D52;
  gl.RENDERBUFFER_ALPHA_SIZE        = 0x8D53;
  gl.RENDERBUFFER_DEPTH_SIZE        = 0x8D54;
  gl.RENDERBUFFER_STENCIL_SIZE      = 0x8D55;
  
  gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE           = 0x8CD0;
  gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME           = 0x8CD1;
  gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL         = 0x8CD2;
  gl.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 0x8CD3;
  
  gl.COLOR_ATTACHMENT0              = 0x8CE0;
  gl.DEPTH_ATTACHMENT               = 0x8D00;
  gl.STENCIL_ATTACHMENT             = 0x8D20;
  gl.DEPTH_STENCIL_ATTACHMENT       = 0x821A;
  
  gl.NONE                           = 0;
  
  gl.FRAMEBUFFER_COMPLETE                      = 0x8CD5;
  gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT         = 0x8CD6;
  gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8CD7;
  gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS         = 0x8CD9;
  gl.FRAMEBUFFER_UNSUPPORTED                   = 0x8CDD;
  
  gl.FRAMEBUFFER_BINDING            = 0x8CA6;
  gl.RENDERBUFFER_BINDING           = 0x8CA7;
  gl.MAX_RENDERBUFFER_SIZE          = 0x84E8;
  
  gl.INVALID_FRAMEBUFFER_OPERATION  = 0x0506;
  
  /* WebGL-specific enums */
  gl.UNPACK_FLIP_Y_WEBGL            = 0x9240;
  gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
  gl.CONTEXT_LOST_WEBGL             = 0x9242;
  gl.UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;
  gl.BROWSER_DEFAULT_WEBGL          = 0x9244;


  gl.update = function() {
    return commands.length > 0;
  };

  var
  // Counters for identifiers
  contextCounter = 0,
  // WebGL contexts
  contexts = [],
  canvases = [];

  gl.refresh = function(obj) {
    if (obj instanceof WebGLProgram && obj['_glquery_id'] != null) {
      shaderLocations[obj._glquery_id] = {};
    }
  };

  // Utility functions for working with tags
  // Test whether t0 contains any of the tags in ts1
  var containsAnyTags = function(t0, ts1) {
    // TODO: This function can probably be optimized quite a bit (possibly 
    //       by converting ts1 into a regular expression instead)
    // See also http://ejohn.org/blog/revised-javascript-dictionary-search/
    var ts0 = t0.split(' ');
    for (var i = 0; i < ts0.length; ++i) {
      if (ts0[i] === '') continue;
      for (var j = 0; j < ts1.length; ++j) {
        if (ts0[i] === ts1[j])
          return true;
      }
    }
    return false;
  };

  // A module for managing (WebGL) state
  var collectCommands = function(tags, commandsStack, commandsState) {
    for (var i = 0; i < tags.length; ++i) {
      // TODO: (Optimization) 
      //       How fast is a lookup for an item that doesn't exist? 
      //       Would this be worst-case performance?
      //       Could it be faster to create separate a structure for storing tags that have no commands?
      //       Or perhaps create empty states for these...
      var tagCommandsState = tagCommands[tags[i]];
      if (typeof tagCommandsState === 'undefined')
        continue;
      commandsStack.push(tagCommandsState); // Concatenate tagCommandsState to commandsStack (mutating the original array)
      var shaderState = tagCommandsState[command.shaderProgram];
      if (shaderState != null) {
        commandsState[command.shaderProgram] = shaderState;
      }
    }
  },
  updateStateHashes = function(node, commandsStack, commandsState) {
    // Meaning of the lastUpdate flag:
    // -1  Update this node and all its children (happens when a key in
    //     {key: [...]} changes before some time before this node is updated)
    // 0   Update this node and possibly (but not necessarily) some of its
    //     children (happens when a tag in a leaf node changes, i.e. a tag in a
    //     string value, or when one of the child nodes changes)
    // 1   This node has just been updated
    // 2   This node was up to date before updateStateHashes was called

    // Hash the state structure returned by collectCommands
    var hashState = function(commandsState) {
      return commandsState[command.shaderProgram].join('$');
    };
    assertInternal(node.hashes != null && typeof node.lastUpdate !== 'undefined', "Node properties are not properly initialized.");
    // Test whether this node or any of its children needs to be updated
    if (node.lastUpdate > 0) {
      node.lastUpdate = 2;
      return;
    }
    // Update hashes
    node.hashes = {};
    if (typeof commandsStack === 'undefined')
      commandsStack = [];
    if (typeof commandsState === 'undefined')
      commandsState = [[]];
    for (var i = 0; i < node.length; ++i) {
      if (typeof node[i] === 'string') {
        // Collect commands
        var childCommandsStack = [];
        var childCommandsState = commandsState.slice(); // Shallow copy of the state (TODO: this will not work for all types of commands, only basic ones like shaderProgram)
        collectCommands(node[i].split(' '), childCommandsStack, childCommandsState);
        // Store commands in the corresponding state hash
        var stateHash = hashState(childCommandsState);
        var hashCommandsStack = node.hashes[stateHash];
        if (typeof hashCommandsStack === 'undefined')
          hashCommandsStack = node.hashes[stateHash] = [];
        hashCommandsStack.push(commandsStack.concat(childCommandsStack));
      }
      else {
        for (var key in node[i]) {
          // Collect commands
          var childCommandsStack = [];
          var childCommandsState = commandsState.slice(); // Shallow copy of the state (TODO: this will not work for all types of commands, only basic ones like shaderProgram)
          collectCommands(node[i].split(' '), childCommandsStack, childCommandsState);
          // Update the state hashes for the children
          var childNode = node[i][key];
          if (node.lastUpdate === -1)
            childNode.lastUpdate = -1;
          childCommandsStack = commandsStack.concat(childCommandsStack);
          updateStateHashes(childNode, childCommandsStack, childCommandsState);
          // Merge the child node's hashes with this node's hashes
          for (var stateHash in childNode.hashes) {
            var hashCommandsStack = node.hashes[stateHash];
            if (typeof hashCommandsStack === 'undefined')
              node.hashes[stateHash] = childNode.hashes[stateHash];
            else
              node.hashes[stateHash] = hashCommandsStack.concat(childNode.hashes[stateHash]);
          }
        }
      }
    }
    node.lastUpdate = 1;
  },
  updateSceneHashes = function(id) {
    if (typeof scenes[id] === 'undefined')
      return;
    // Collect commands
    var commandsStack = [];
    var commandsState = [[]];
    collectCommands(id.split(' '), commandsStack, commandsState);
    // Update the state hashes
    updateStateHashes(scenes[id], commandsStack, commandsState);
  },
  updateDirtyHashes = function(dirtyTags) {
    var update = function(dirtyTags, key, node) {
      if (containsAnyTags(key, dirtyTags)) {
        node.lastUpdate = -1;
        // No need to update the children too because they'll automatically be updated
      }
      else {
        // Look for dirty tags in the children 
        for (var i = 0; i < node.length; ++i) {
          var n = node[i];
          if (typeof n === 'string') {
            if (node.lastUpdate < 1)
              continue; // We already know this node must be updated
            if (containsAnyTags(n, dirtyTags))
              // This node should be updated regardless of whether any children 
              // need to be updated
              node.lastUpdate = 0;
          }
          else
            for (var key in n) {
              var n = n[key];
              update(dirtyTags, key, n);
              if (n.lastUpdate < 1) {
                node.lastUpdate = 0;
              }
            }
        }
      }
    };
    for (var key in scenes) {
      update(dirtyTags, key, scenes[key]);
    }
  };

  var command = {
    // Hashed state (These commands are sorted by a hash function)
    shaderProgram: 0,
    // Unhashed state (These commands can be updated without resorting)
    geometry: 1,
    vertexElem: 2,
    // Unhashed state dictionaries (These commands have an extra key for a variable identifier)
    vertexAttribBuffer: 3,
    vertexAttrib1: 4,
    vertexAttrib2: 5,
    vertexAttrib3: 6,
    vertexAttrib4: 7,
    uniform: 8,
    // Scene graph
    insert: 9,
    remove: 10
  },
  commandsSize = {
    hashedState: 1,
    unhashedState: 2,
    unhashedStateDictionary: 6,
    sceneGraph: 2
  },
  commandDispatch = [
    // shaderProgram: 0
    function(context, selector, args) {
      logDebug("dispatch command: shaderProgram", context, selector, args);

      if (args.length > 0) {
        // Generate shader program if necessary
        // instanceof appears to be a valid test according to the khronos conformance suite
        // https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/sdk/tests/conformance/misc/instanceof-test.html
        var shaderProgram;
        if (args[0] instanceof WebGLProgram)
          shaderProgram = args[0];
        else if (args[0] instanceof WebGLShader) {
          // TODO: There's no context available for this instance
          // shaderProgram = context.createProgram();
          // for (var i = 0; i < args.length; ++i) {
          //   context.attachShader(shaderProgram, args[i]);
          // }
          // context.linkProgram(shaderProgram);
          logError("Internal Error: shaderProgram(WebGLShader, ...) is not yet supported by glQuery.");
          return;
        }
        // Add an index to the shader program (We can't index the shader locations by shader program 
        // when the shader program is an instance of WebGLProgram because toString simply gives
        // '[object WebGLProgram]'
        shaderProgram._glquery_id = shaderProgramCounter;
        ++shaderProgramCounter;
        // Cache all associated shader locations (attributes and uniforms)
        //context.useProgram(shaderProgram);
        if (shaderLocations[shaderProgram._glquery_id] == null) {
          var activeAttributes = context.getProgramParameter(shaderProgram, context.ACTIVE_ATTRIBUTES),
          activeUniforms = context.getProgramParameter(shaderProgram, context.ACTIVE_UNIFORMS),
          locations = shaderLocations[shaderProgram._glquery_id] = { attributes: {}, uniforms: {} };
          for (var i = 0; i < activeAttributes; ++i) {
            var attrib = context.getActiveAttrib(shaderProgram, i);
            locations.attributes[attrib.name] = context.getAttribLocation(shaderProgram, attrib.name);
          }
          for (var i = 0; i < activeUniforms; ++i) {
            var uniform = context.getActiveUniform(shaderProgram, i);
            locations.uniforms[uniform.name] = { 
              location: context.getUniformLocation(shaderProgram, uniform.name),
              size: uniform.size,
              type: uniform.type
            };
          }
        }
        // Add shader program associations to tags
        for (var i = 0; i < selector.length; ++i) {
          //var commandsStruct = (typeof tagCommands[selector[i]] === 'undefined'? (tagCommands[selector[i]] = {}) : tagCommands[selector[i]]);
          var commandsStruct = tagCommands[selector[i]];
          commandsStruct[command.shaderProgram] = shaderProgram; // Only one argument is ever need
        }
      }
      else {
        for (var i = 0; i < selector.length; ++i)
          if (typeof tagCommands[selector[i]] !== 'undefined')
            delete tagCommands[selector[i]][command.shaderProgram];
      }
    },
    // geometry: 1
    function(context, selector, args) {
      logDebug("dispatch command: geometry", context, selector, args);
      if (args.length > 0) {
        for (var i = 0; i < selector.length; ++i) {
          //var commandsStruct = (typeof tagCommands[selector[i]] === 'undefined'? (tagCommands[selector[i]] = {}) : tagCommands[selector[i]]);
          var commandsStruct = tagCommands[selector[i]];
          commandsStruct[command.geometry] = args;
        }
      }
      else {
        for (var i = 0; i < selector.length; ++i)
          if (typeof tagCommands[selector[i]] !== 'undefined')
            delete tagCommands[selector[i]][command.geometry];
      }
    },
    // vertexElem: 2
    function(context, selector, args) {
      logDebug("dispatch command: vertexElem", context, selector, args);
      // Pre-conditions: args.length == 0 || args.length >= 2
      // If no arguments were given, delete the command
      if (args[0] == null) {
        for (var i = 0; i < selector.length; ++i)
          if (typeof tagCommands[selector[i]] !== 'undefined')
            delete tagCommands[selector[i]][command.vertexElem];
        return;
      }
      /* Cache the buffer size parameter
      if (args[0]._glquery_BUFFER_SIZE == null) {
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, args[0]);
        args[0]._glquery_BUFFER_SIZE = context.getBufferParameter(context.ELEMENT_ARRAY_BUFFER, context.BUFFER_SIZE);
      }//*/
      // Add default arguments
      switch (args.length) {
        case 2:
          args.push(context.UNSIGNED_SHORT);
        case 3:
          args.push(0);
      }
      // Store the command
      for (var i = 0; i < selector.length; ++i) {
        var commandsStruct = (typeof tagCommands[selector[i]] === 'undefined'? (tagCommands[selector[i]] = {}) : tagCommands[selector[i]]);
        commandsStruct[command.vertexElem] = args;
      }
    },
    // vertexAttribBuffer: 3
    function(context, selector, args) {
      logDebug("dispatch command: vertexAttribBuffer", context, selector, args);
      // Pre-conditions: args.length == 0 || args.length == 1 || args.length >= 3
      // If no arguments were supplied, delete all the vertexAttribBuffer commands
      if (args[0] == null) {
        for (var i = 0; i < selector.length; ++i)
          if (typeof tagCommands[selector[i]] !== 'undefined')
            delete tagCommands[selector[i]][command.vertexAttribBuffer];
        return;
      }
      // If no buffer was supplied, delete the vertexAttribBuffer command for the given attribute name
      if (args[1] == null) {
        // TODO...
        return;
      }
      /* Cache the buffer size parameter
      if (args[1]._glquery_BUFFER_SIZE == null) {
        context.bindBuffer(context.ARRAY_BUFFER, args[1]);
        args[1]._glquery_BUFFER_SIZE = context.getBufferParameter(context.ARRAY_BUFFER, context.BUFFER_SIZE);
      }//*/
      // Add default arguments
      // TODO...
      // Store the command
      for (var i = 0; i < selector.length; ++i) {
        var commandsStruct = (typeof tagCommands[selector[i]] === 'undefined'? (tagCommands[selector[i]] = {}) : tagCommands[selector[i]]);
        commandsStruct[command.vertexAttribBuffer] = args;
      }
    },
    // vertexAttrib1: 4
    function(context, selector, args) {
      logDebug("dispatch command: vertexAttrib1", context, selector, args);
    },
    // vertexAttrib2: 5
    function(context, selector, args) {
      logDebug("dispatch command: vertexAttrib2", context, selector, args);
    },
    // vertexAttrib3: 6
    function(context, selector, args) {
      logDebug("dispatch command: vertexAttrib3", context, selector, args);
    },
    // vertexAttrib4: 7
    function(context, selector, args) {
      logDebug("dispatch command: vertexAttrib4", context, selector, args);
    },
    // uniform: 8
    function(context, selector, args) {
      logDebug("dispatch command: uniform", context, selector, args);
      // If no arguments were supplied, delete all the uniform commands
      if (args[0] == null) {
        for (var i = 0; i < selector.length; ++i)
          if (typeof tagCommands[selector[i]] !== 'undefined')
            delete tagCommands[selector[i]][command.uniform];
        return;
      }
      // If no argument was supplied, delete the uniform command for the given uniform name
      if (args[1] == null) {
        // TODO...
        return;
      }
      // Store the command
      for (var i = 0; i < selector.length; ++i) {
        var commandsStruct = (typeof tagCommands[selector[i]] === 'undefined'? (tagCommands[selector[i]] = {}) : tagCommands[selector[i]]),
        uniformTable = commandsStruct[command.uniform],
        uniformArgs = args.slice(1);
        if(uniformTable == null)
          uniformTable = commandsStruct[command.uniform] = {};
        // (Vectors are automatically packed into arrays when necessary)
        uniformTable[args[0]] = uniformArgs.length == 1 || (uniformArgs.length > 0 && Array.isArray(uniformArgs[0]))? uniformArgs : [uniformArgs];
      }
    },
    // insert: 9
    function(context, selector, args) {
      logDebug("dispatch command: insert", context, selector, args);
    },
    // remove: 10
    function(context, selector, args) {
      logDebug("dispatch command: remove", context, selector, args);
    }
  ],
  commandEval = [
    // shaderProgram: 0
    function(context, renderState, args) {
      logDebug("eval command: shaderProgram", context, renderState, args);
      context.useProgram(args);
      renderState.shaderProgram = args;
    },
    // geometry: 1
    function(context, renderState, args) {
      logDebug("eval command: geometry", context, renderState, args);
      if (renderState.shaderProgram) {
        if (renderState.useElements)
          context.drawElements(args[0], args[1] != null? args[1] : renderState.numVertices, renderState.elementsType, renderState.elementsOffset + (args[2] != null? args[2] : 0));
        else
          context.drawArrays(args[0], args[2] != null? args[2] : 0, args[1] != null? args[1] : renderState.numVertices);
      }
    },
    // vertexElem: 2
    function(context, renderState, args) {
      logDebug("eval command: vertexElem", context, renderState, args);
      // TODO: Don't rebind buffer if not necessary?
      context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, args[0]); 
      renderState.numVertices = args[1];
      renderState.elementsType = args[2];
      renderState.elementsOffset = args[3];
      renderState.useElements = true;
    },
    // vertexAttribBuffer: 3
    function(context, renderState, args) {
      logDebug("eval command: vertexAttribBuffer", context, renderState, args);
      var locations = (renderState.shaderProgram != null? shaderLocations[renderState.shaderProgram._glquery_id] : null);
      if (locations != null) {
        var attribLocation = (typeof args[0] == 'number'? args[0] : locations.attributes[args[0]]);
        if (typeof attribLocation !== 'undefined' && attribLocation !== -1) {
          // TODO: Don't rebind buffer if not necessary?
          context.bindBuffer(context.ARRAY_BUFFER, args[1]);
          // TODO: Don't re-enable attribute array if not necessary?
          context.enableVertexAttribArray(attribLocation);
          // TODO: Use additional information from the WebGLActiveInfo struct for parameters?
          // TODO: Get type (e.g. gl.FLOAT) from WebGLActiveInfo instead?
          context.vertexAttribPointer(attribLocation, args[4], args[3], args[5], args[6], args[7]);
          if (!renderState.useElements)
            renderState.numVertices = Math.min(renderState.numVertices, args[2] / args[4]);
        }
      }
    },
    // vertexAttrib1: 4
    function(context, renderState, args) {
      logDebug("eval command: vertexAttrib1", context, renderState, args);
    },
    // vertexAttrib2: 5
    function(context, renderState, args) {
      logDebug("eval command: vertexAttrib2", context, renderState, args);
    },
    // vertexAttrib3: 6
    function(context, renderState, args) {
      logDebug("eval command: vertexAttrib3", context, renderState, args);
    },
    // vertexAttrib4: 7
    function(context, renderState, args) {
      logDebug("eval command: vertexAttrib4", context, renderState, args);
    },
    // uniform: 8
    (function() {
      var uniformEval = {};
      uniformEval[gl.FLOAT] = WebGLRenderingContext.prototype.uniform1f;
      uniformEval[gl.FLOAT_VEC2] = WebGLRenderingContext.prototype.uniform2fv;
      uniformEval[gl.FLOAT_VEC3] = WebGLRenderingContext.prototype.uniform3fv;
      uniformEval[gl.FLOAT_VEC4] = WebGLRenderingContext.prototype.uniform4fv;
      uniformEval[gl.INT] = WebGLRenderingContext.prototype.uniform1i;
      uniformEval[gl.INT_VEC2] = WebGLRenderingContext.prototype.uniform2iv;
      uniformEval[gl.INT_VEC3] = WebGLRenderingContext.prototype.uniform3iv;
      uniformEval[gl.INT_VEC4] = WebGLRenderingContext.prototype.uniform4iv;
      uniformEval[gl.BOOL] = WebGLRenderingContext.prototype.uniform1i;
      uniformEval[gl.BOOL_VEC2] = WebGLRenderingContext.prototype.uniform2iv;
      uniformEval[gl.BOOL_VEC3] = WebGLRenderingContext.prototype.uniform3iv;
      uniformEval[gl.BOOL_VEC4] = WebGLRenderingContext.prototype.uniform4iv;
      uniformEval[gl.FLOAT_MAT2] = function(location, value, transpose) { this.uniformMatrix2fv(location, transpose != null? transpose : false, value); };
      uniformEval[gl.FLOAT_MAT3] = function(location, value, transpose) { this.uniformMatrix3fv(location, transpose != null? transpose : false, value); };
      uniformEval[gl.FLOAT_MAT4] = function(location, value, transpose) { this.uniformMatrix4fv(location, transpose != null? transpose : false, value); };
      //uniformEval[gl.SAMPLER_2D] =
      //uniformEval[gl.SAMPLER_CUBE] = 

      return function(context, renderState, args) {
        logDebug("eval command: uniform", context, renderState, args);
        // TODO: Detect uniformMatrix (supplied without the special transpose flag?)
        // I.e. use attributes stored by getLocation?
        var locations = (renderState.shaderProgram != null? shaderLocations[renderState.shaderProgram._glquery_id] : null);
        if (locations != null) {
          // TODO: How to get the uniform info if it is already given as a UniformLocation object?
          //       Can we query/cache it in a fast way?
          //       Probably need to set up benchmark for this...
          for (var uniformName in args) { // args is a table of uniforms
            /* Not supported: WebGLUniformLocation - (because uniform locations are specific to some shader program)
            if (key instanceof WebGLUniformLocation) {
              console.log(uniformLocation);	
              uniformLocation = args[0];
              // TODO: uniformInfo = locations.uniforms[args[0]];
            }*/
            var uniformInfo = locations.uniforms[uniformName];
            if (uniformInfo != null) {
              var uniformLocation = uniformInfo.location,
              uniformArgs = args[uniformName];
              if (uniformLocation != null)
                uniformEval[uniformInfo.type].apply(context, [uniformLocation].concat(uniformArgs));
            }
          }
        }
      };
    })()
  ];

  //assert(commandDispatch.length === command.length, "Internal Error: Number of commands in commandDispatch is incorrect.");
  assert(commandDispatch.length === commandsSize.hashedState + commandsSize.unhashedState + commandsSize.unhashedStateDictionary + commandsSize.sceneGraph, "Internal Error: Total commands size does not add up to the correct number.");
  assert(commandEval.length === commandDispatch.length - commandsSize.sceneGraph, "Internal Error: Number of commands in commandEval is incorrect.");
  
  // Dispatches all commands in the queue
  var dispatchCommands = function(context, commands) {
    for (var i = 0; i < commands.length; ++i) {
      var c = commands[i],
      key = c[0],
      selector = c[1],
      commandArgs = c[2];
      // TODO: Test performance against `dirtyTags = dirtyTags.concat(selector);`
      //       This way likely results in better garbage collector behaviour
      //       But also, what about `dirtyTags += selector;`?
      for (var j = 0; j < selector.length; ++j)
        dirtyTags.push(selector[j]);
      commandDispatch[key](context, selector, commandArgs);
    }
    commands.length = 0;
  },
  // Collect and execute webgl commands using a render state structure to keep track of state changes
  evalCommands = function(context, renderState, commandsStack) {
    logDebug("evalCommands", context, renderState, commandsStack);
    
    //var newRenderState = new Array(commandEval.length);
    var newRenderState = commandsStack[0].slice(); // Shallow copy of the state
    newRenderState.numVertices = Number.POSITIVE_INFINITY;
    newRenderState.elementsOffset = 0;
    newRenderState.elementsType = context.UNSIGNED_SHORT;
    newRenderState.useElements = false;
    
    // Update render state from the commandsStack (in reverse)
    for (var i = commandsStack.length - 2; i >= 0; --i) {
      var commandsState = commandsStack[i];
      for (var j = 0; j < commandEval.length; ++j)
        if (newRenderState[j] == null)
          newRenderState[j] = commandsState[j];
    }
    // Copy render state from parents where required
    for (var i = 0; i < commandEval.length; ++i)
      if (newRenderState[i] == null)
        newRenderState[i] = renderState[i];
    
    // Do WebGL API calls

    // Shader program
    var shaderProgramCommand = newRenderState[command.shaderProgram];
    if (shaderProgramCommand != renderState[command.shaderProgram]) {
      commandEval[command.shaderProgram](context, newRenderState, shaderProgramCommand);
    }
    // Shader state (excluding geometry which is a special case)
    for (var i = command.vertexElem; i <= command.uniform; ++i) {
      var stateCommand = newRenderState[i];
      if (stateCommand != null && stateCommand !== renderState[i])
        commandEval[i](context, newRenderState, stateCommand);
    }
    // Draw geometry
    var geometryCommand = newRenderState[command.geometry];
    if (geometryCommand != null)
      commandEval[command.geometry](context, newRenderState, geometryCommand);

    // Update current render state
    renderState = newRenderState;
  };
    
  // Append a command to the quey
  gl.command = function() {
    // TODO: consider what should be done if the command is 'insert' or 'remove'
    if (!assertNumberOfArguments(arguments, 1, 'command')) return gl;
    if (!assert(command[arguments[0]] != null, "Unknown command '" + command[arguments[0]] + "' used.")) return gl;
    commands.push([command[arguments[0]], (command[arguments[1]] != null? command[arguments[1]] : null), Array.prototype.slice.call(arguments, 2)]);
    return gl;
  };


  // glQuery API
  // Note: According to https://developer.mozilla.org/en/JavaScript/Reference/Functions_and_function_scope/arguments
  //       arguments is not a proper Array object, so assume arguments.slice is not implemented.
  gl.fn = gl.prototype = {
    init: function() {
      //logDebug("init");
      this._selector = Array.prototype.slice.call(arguments);
      return this;
    },
    render: function(context) {
      //logDebug("render");
      if (!assertType(context, 'object', 'render', 'context')) return this;
      // TODO: assert that the context is a WebGL context specifically
      // Dispatch all commands waiting in the queue
      dispatchCommands(context, commands);
      // Update the state hashes for sorting commands
      // (It could theoretically be faster to update only the scenes that are needed for the selector)
      if (dirtyTags.length > 0) {
        updateDirtyHashes(dirtyTags);
        for (var key in scenes)
          updateSceneHashes(scenes[key]);
        dirtyTags.length = 0;
      }
      // Execute the WebGL commands associated with this selector
      var renderSubTree = function(renderState, node) {
        for (var key in node.hashes) {
          var objectCommandStacks = node.hashes[key];
          for (var i = 0; i < objectCommandStacks.length; ++i)
            evalCommands(context, renderState, objectCommandStacks[i]); 
        }
        /*for (var i = 0; i < node.length; ++i) {
          var n = node[i];
          if (typeof n !== 'string') {
            for (var key in n.hashes) {
              evalCommands(context, renderState, n.hashes[key]);
            }
          }
        }*/
      }
      var renderTraverse = function(renderState, node, selector) {
        for (var i = 0; i < node.length; ++i) {
          var n = node[i];
          if (typeof n !== 'string') {
            for (var key in n)
              if (containsAnyTags(key, this._selector))
                renderSubTree(renderState, n[key]);
              else
                renderTraverse(renderState, n[key], this._selector);
          }
        }
      };
      for (var key in scenes) {
        var renderState = new Array(commandEval.length);
        if (containsAnyTags(key, this._selector))
          renderSubTree(renderState, scenes[key]);
        else
          renderTraverse(renderState, scenes[key], this._selector);
      }
      // Flush WebGL commands
      // TODO: Do we need to flush the WebGL commands? (Perhaps later when rendering to textures for example)
      //context.flush();
      return this;
    },
    command: function() {
      // TODO: consider what should be done if the command is 'insert' or 'remove'
      if (!assertNumberOfArguments(arguments, 1, 'command')) return this;
      if (!assert(command[arguments[0]] != null, "Unknown command '" + command[arguments[0]] + "' used.")) return this;
      commands.push([command[arguments[0]], this._selector, Array.prototype.slice.call(arguments, 1)]);
      return this;
    },
    shaderProgram: function() {
      logDebug("shaderProgram");
      commands.push([command.shaderProgram, this._selector, Array.prototype.slice.call(arguments)]);
      return this;
    },
    geometry: function() {
      logDebug("geometry");
      commands.push([command.geometry, this._selector, Array.prototype.slice.call(arguments)]);
      return this;
    },
    points: function() {
      logDebug("points");
      commands.push([command.geometry, this._selector, [gl.POINTS].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    lines: function() {
      logDebug("lines");
      commands.push([command.geometry, this._selector, [gl.LINES].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    lineLoop: function() {
      logDebug("lineLoop");
      commands.push([command.geometry, this._selector, [gl.LINE_LOOP].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    lineStrip: function() {
      logDebug("lineStrip");
      commands.push([command.geometry, this._selector, [gl.LINE_STRIP].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    triangles: function() {
      logDebug("triangles");
      commands.push([command.geometry, this._selector, [gl.TRIANGLES].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    triangleStrip: function() {
      logDebug("triangleStrip");
      commands.push([command.geometry, this._selector, [gl.TRIANGLE_STRIP].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    triangleFan: function() {
      logDebug("triangleFan");
      commands.push([command.geometry, this._selector, [gl.TRIANGLE_FAN].concat(Array.prototype.slice.call(arguments))]);
      return this;
    },
    vertexAttrib: function() {
      logDebug("vertexAttrib");
      commands.push([command.vertexAttribBuffer, this._selector, Array.prototype.slice.call(Array.prototype.slice.call(arguments))]);
      return this;
    },
    vertexElem: function() {
      logDebug("vertexElem");
      commands.push([command.vertexElem, this._selector, Array.prototype.slice.call(Array.prototype.slice.call(arguments))]);
      return this;
    },
    uniform: function() {
      logDebug("uniform");
      commands.push([command.uniform, this._selector, Array.prototype.slice.call(Array.prototype.slice.call(arguments))]);
      return this;
    }
  };

  // Create a dummy API which behaves like a stand-in builder object when the selector fails
  var apiDummy = {};
  for (var key in gl.fn) {
    apiDummy[key] = function() { return this; };
  };


  var triggerContextEvents = function(fns, event) {
    for (var i = 0; i < fns.length; ++i)
      if (fns[i][1])
        fns[i][0](event);
  };

  // Initialize a WebGL canvas
  var canvasExtAPI = {};
  gl.canvas = function(selector, contextAttr) {
    var canvasEl, domAttr = domAttr != null? domAttr : {};
    logDebug("canvas");
    var dummy = {
      start: function() { return this; },
      clear: function() { return this; },
      clearColor: function() { return this; },
      clearDepth: function() { return this; },
      clearStencil: function() { return this; }
    };
    // Get existing canvas element
    if (!assert(typeof selector === 'string' || (typeof selector === 'object' && (selector.nodeName === 'CANVAS' || selector instanceof WebGLRenderingContext)), "In call to 'canvas', expected type 'string', 'undefined' or 'canvas element' for 'selector'. Instead, got type '" + typeof selector + "'."))
      return dummy;
    canvasEl = typeof selector === 'object'? (selector instanceof WebGLRenderingContext? selector.canvas : selector) : document.querySelector(selector);
    if (!assert(canvasEl != null && typeof canvasEl === 'object' && canvasEl.nodeName === 'CANVAS', "In call to 'canvas', could not initialize canvas element."))
      return dummy;
    if (typeof selector === 'string')
      logInfo("Initialized canvas: " + selector);
    else
      logInfo("Initialized canvas");

    // Initialize the WebGL context
    var canvasCtx = selector instanceof WebGLRenderingContext? selector : canvasEl.getContext('experimental-webgl', contextAttr);
    if (!assert(canvasCtx != null, "Could not get a 'experimental-webgl' context."))
      return dummy;

    // Wrap glQuery canvas
    var wrapCanvasAPI = function(self) {
      var api = { // Public
        start: function(rootId, fnPre, fnPost, fnIdle) {
          logDebug("canvas.start");
          if (rootId != null) {
            if (!assertType(rootId, 'string', 'canvas.start', 'rootId')) return this;
            self.rootId = rootId;
            self.fnPre = typeof fnPre === 'function'? fnPre : null;
            self.fnPost = typeof fnPost === 'function'? fnPost : null;
            self.fnIdle = typeof fnIdle === 'function'? fnIdle : null;
            self.nextFrame = window.requestAnimationFrame(self.fnLoop(), self.glContext.canvas);
            self.suspended = false;
          }
          return this;
        },
        suspend: function() {
          logDebug("canvas.suspend");
          window.cancelAnimationFrame(self.suspend);
          self.nextFrame = null;
          self.suspended = true;
          return this;
        },
        clear: function(mask) {
          logDebug("canvas.clear");
          self.clearMask = mask;
          return this;
        },
        clearColor: function(r,g,b,a) {
          logDebug("canvas.clearColor");
          self.glContext.clearColor(r,g,b,a);
          return this;
        },
        clearDepth: function(d) {
          logDebug("canvas.clearDepth");
          self.glContext.clearDepth(d);
          return this;
        },
        clearStencil: function(s) {
          logDebug("canvas.clearStencil");
          self.glContext.clearStencil(s);
          return this;
        },
        viewport: function(x, y, width, height) {
          logDebug("canvas.viewport");
          self.glContext.viewport(x, y, width, height);
          return this;
        }
      };
      for (var k in canvasExtAPI)
        if (!(k in api)) // Don't override the base api
          api[k] = canvasExtAPI[k](self);
      return api;
    };

    // Add an identifying index to the context
    if (typeof canvasCtx._glquery_id !== 'undefined')
      return wrapCanvasAPI(canvases[canvasCtx._glquery_id]);

    canvasCtx._glquery_id = contextCounter;
    contexts[canvasCtx._glquery_id] = canvasCtx;
    ++contextCounter;    

    canvasEl.addEventListener("webglcontextlost", function(event) {
      var i;
      // Trigger user events
      triggerContextEvents(eventFns.contextlost, event);
      // Cancel rendering on all canvases that use request animation frame via
      // gl.canvas(...).start().
      for (i = 0; i < contexts.length; ++i) {
        var context = contexts[i];
        if (context.glContext.canvas !== canvasEl)
          continue;
        if (context.nextFrame != null)
          window.cancelAnimationFrame(context.nextFrame);
        break;
      }
      // Prevent default handling of event
      event.preventDefault();
    }, false);

    canvasEl.addEventListener("webglcontextrestored", function(event) {
      var i;
      // TODO: reload managed webgl resources
      // Trigger user events
      triggerContextEvents(eventFns.contextrestored, event);
      // Resume rendering on all contexts that have not explicitly been suspended
      // via gl.canvas(...).suspend().
      for (i = 0; i < contexts.length; ++i) {
        var context = contexts[i];
        if (context.glContext.canvas !== canvasEl)
          continue;
        if (context.nextFrame == null && context.suspended === false)
          window.requestAnimationFrame(context.fnLoop(), context.glContext.canvas);
        break;
      }
    }, false);

    canvasEl.addEventListener("webglcontextcreationerror", function(event) {
      triggerContextEvents(eventFns.contextcreationerror, event);
    }, false);
    
    // Add context to the global list
    canvases[canvasCtx._glquery_id] = {
      glContext: canvasCtx,
      rootId: null,
      nextFrame: null,
      suspended: true,
      clearMask: gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
      fnPre: null,
      fnPost: null,
      fnIdle: null,
      fnLoop: function() {
        self = this;
        return function fnLoop() {
          if (self.glContext.isContextLost())
            return; // Ensure rendering does not continue if context is lost
          if (gl.update()) {
            if (self.fnPre) self.fnPre();
            self.glContext.clear(self.clearMask);
            gl(self.rootId).render(self.glContext);
            if (self.fnPost) self.fnPost();
          }
          else if (self.fnIdle) self.fnIdle();
          self.nextFrame = window.requestAnimationFrame(fnLoop, self.glContext.canvas);
        };
      }
    };
    return wrapCanvasAPI(canvases[canvasCtx._glquery_id]);
  };

  gl.canvas.extend = function(name, fn) {
    logDebug("canvas.extend (" + name + ")");
    if (!assertType(name, 'string', 'canvas.extend', 'name')) return this;
    if (!assertType(fn, 'function', 'canvas.extend', 'fn')) return this;
    canvasExtAPI[name] = fn;
    return gl.canvas;
  };

  gl.canvas.create = function(id, contextAttr, domAttr) {
    logDebug("canvas.create (#" + id + ")");
    var id = (id == null)? 'glqueryCanvas' : id;
    if (!assertType(id, 'string', 'canvas.create', 'id')) return this;
    var newDomAttr = { id: id, width: 800, height: 800 };
    for (var k in domAttr)
      newDomAttr[k] = domAttr[k];
    var canvasEl = document.createElement('canvas');
    Object.keys(newDomAttr).map(function(k){ canvasEl.setAttribute(k, newDomAttr[k]); }).join(' ');    
    document.write(canvasEl.outerHTML);
    return gl.canvas("#" + id, contextAttr);
  };

  // Create a glQuery scene hierarchy
  gl.scene = function() {
    logDebug("scene");
    var rootIds = [];
    for (var i = 0; i < arguments.length; ++i) {
      var sceneDef = arguments[i];
      if (Array.isArray(sceneDef)) {
        // Don't nest arrays, generate a new id for the node instead
        var id = normalizeNodes(generateId());
        scenes[id] = normalizeNodes(sceneDef);
        rootIds.push(id);
        continue;
      }
      switch (typeof sceneDef) {
        case 'string':
          var id = normalizeNodes(sceneDef);
          scenes[id] = [];
          rootIds.push(id);
          continue;
        case 'number':
          var id = normalizeNodes(String(sceneDef));
          scenes[id] = [];
          rootIds.push(id);
          continue;
        default:
          if (!assert(typeof sceneDef === 'object', "In call to 'scene', expected type 'string' ,'number' or 'object' for 'sceneDef'. Instead, got type '" + typeof sceneDef + "'."))
            continue;
          var normalizedScene = normalizeNodes(sceneDef);
          if (normalizedScene != null) {
            for (key in normalizedScene) {
              rootIds.push(key);
              scenes[key] = normalizedScene[key];
            }
          }
      }
    }
    if (arguments.length === 0) {
      scenes = {}; // Clear the scenes
      return apiDummy;
    }
    if (rootIds.length === 0) {
      logApiError("could not create scene from the given scene definition.");
      return apiDummy;
    }
    // Generate the paths for each tag in the normalized scene?
    // TODO
    // Update the state hashes for each of the root ids
    for (var i = 0; i < rootIds.length; ++i) {
      updateSceneHashes(rootIds[i]);
    }
    return gl.fn.init.apply(gl.fn, rootIds);
  };

  // Load a scenejs shader
  gl.shader = function(id, code) {
    logDebug("shader");
    // TODO: shaders[id] already exists, make sure all related resources are cleaned up
    if (typeof code == null) {
      delete shaders[id];
    } else {
      if (!assertType(code, 'string', 'shader', 'code')) return gl;
      shaders[id] = code;
    }
    return gl;
  };

  var registerContextEvent = function(eventName, fn, active) {
    var i, active = active;
    // Clear the list of callbacks if nothing was passed in
    if(typeof fn === 'undefined') {
      eventFns[eventName] = [];
      return;
    }
    // Check that callback is a function and active is a boolean
    assertType(fn, 'function', eventName, 'fn');
    typeof active !== 'undefined' && assertType(active, 'boolean', eventName, 'active');
    // Prevent the same callback from being added to the list twice.
    active = active === false? active : true;
    for (i = 0; i < eventFns[eventName].length; ++i)
      if (eventFns[eventName][i][0] === fn) {
        eventFns[eventName][i][1] = active;
        return;
      }
    // Add the event callback
    eventFns[eventName].push([fn, active]);
  };
  
  gl.contextlost = function(fn, active) { registerContextEvent('contextlost',fn,active); };
  gl.contextrestored = function(fn, active) { registerContextEvent('contextrestored',fn,active); };
  gl.contextcreationerror = function(fn) { registerContextEvent('contextcreationerror',fn,active); };


  gl.worker = function(workerId, js) {
    // TODO:
    logError("(TODO) Workers are not yet implemented...");
  };

  // Export glQuery to a CommonJS module if exports is available
  if (typeof(exports) !== "undefined" && exports !== null)
    exports.gl = exports.glQuery = gl;
  return gl;
})();
var gl = typeof gl === 'undefined'? glQuery : gl;



/*
 * glQuery-math - A math module from a fluent WebGL engine (https://github.com/glQuery)
 * glQuery-math is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 */
var glQueryMath = new (function() {
"use strict";

var glQueryMath = this != null? this : window;
(function(){
var gl = glQueryMath;

// Define a local copy of glQuery
var MathMemoryPool = {
  matrix4: [
    [0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0], 
    [0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0],
    [0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0], 
    [0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0, 0.0,0.0,0.0,0.0]],
  matrix3: [
    [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0], 
    [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0],
    [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0]],
  matrix2: [
    [0.0,0.0, 0.0,0.0], 
    [0.0,0.0, 0.0,0.0]],
  vector4: [[0.0,0.0,0.0,0.0], [0.0,0.0,0.0,0.0], [0.0,0.0,0.0,0.0], [0.0,0.0,0.0,0.0]],
  vector3: [[0.0,0.0,0.0], [0.0,0.0,0.0], [0.0,0.0,0.0], [0.0,0.0,0.0]],
  vector2: [[0.0,0.0], [0.0,0.0], [0.0,0.0], [0.0,0.0]]
};

var v2 = gl.vec2 = {};
v2.add = function(result,a,b) {
  result[0] = a[0] + b[0]; 
  result[1] = a[1] + b[1];
  return result;
};
v2.subtract = function(result,a,b) {
  result[0] = a[0] - b[0];
  result[1] = a[1] - b[1];
  return result;
};
v2.mul = function(result,a,b) {
  result[0] = a[0] * b;
  result[1] = a[1] * b;
  return result;
};
v2.div = function(result,a,b) {
  result[0] = a[0] / b;
  result[1] = a[1] / b;
  return result;
};
v2.neg = function(result,a) {
  result[0] = -a[0];
  result[1] = -a[1];
};
v2.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1];
};
v2.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
};

var v3 = gl.vec3 = {};
v3.add = function(result,a,b) {
  result[0] = a[0] + b[0]; 
  result[1] = a[1] + b[1];
  result[2] = a[2] + b[2]; 
  return result;
};
v3.sub = function(result,a,b) {
  result[0] = a[0] - b[0];
  result[1] = a[1] - b[1];
  result[2] = a[2] - b[2];
  return result;
};
v3.mul = function(result,a,b) {
  result[0] = a[0] * b;
  result[1] = a[1] * b;
  result[2] = a[2] * b;
  return result;
};
v3.div = function(result,a,b) {
  result[0] = a[0] / b;
  result[1] = a[1] / b;
  result[2] = a[2] / b;
  return result;
};
v3.neg = function(result,a) {
  result[0] = -a[0];
  result[1] = -a[1];
  result[2] = -a[2];
  return result;
};
v3.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};
v3.cross = function(result,a,b) {
  result[0] = a[1] * b[2] - a[2] * b[1];
  result[1] = a[2] * b[0] - a[0] * b[2];
  result[2] = a[0] * b[1] - a[1] * b[0];
  return result;
};
v3.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
};
v3.normalize = function(result,a) {
  return v3.div(result, a, v3.length(a));
};

var v4 = v4 = {};
v4.add = function(result,a,b) {
  result[0] = a[0] + b[0]; 
  result[1] = a[1] + b[1];
  result[2] = a[2] + b[2]; 
  result[3] = a[3] + b[3];
  return result;
};
v4.subtract = function(result,a,b) {
  result[0] = a[0] - b[0];
  result[1] = a[1] - b[1];
  result[2] = a[2] - b[2];
  result[3] = a[3] - b[3];
  return result;
};
v4.mul = function(result,a,b) {
  result[0] = a[0] * b;
  result[1] = a[1] * b;
  result[2] = a[2] * b;
  result[3] = a[3] * b;
  return result;
};
v4.div = function(result,a,b) {
  result[0] = a[0] / b;
  result[1] = a[1] / b;
  result[2] = a[2] / b;
  result[3] = a[3] / b;
  return result;
};
v4.neg = function(result,a) {
  result[0] = -a[0];
  result[1] = -a[1];
  result[2] = -a[2];
  result[3] = -a[3];
};
v4.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};
v4.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
};

var m3 = gl.matrix3 = {};

m3.mul = function(result,a,b) {
  var r = MathMemoryPool.matrix3[0];
  r[0*3+0] = a[0*3+0] * b[0*3+0] + a[0*3+1] * b[1*3+0] + a[0*3+2] * b[2*3+0];
  r[0*3+1] = a[0*3+0] * b[0*3+1] + a[0*3+1] * b[1*3+1] + a[0*3+2] * b[2*3+1];
  r[0*3+2] = a[0*3+0] * b[0*3+2] + a[0*3+1] * b[1*3+2] + a[0*3+2] * b[2*3+2];
  r[1*3+0] = a[1*3+0] * b[0*3+0] + a[1*3+1] * b[1*3+0] + a[1*3+2] * b[2*3+0];
  r[1*3+1] = a[1*3+0] * b[0*3+1] + a[1*3+1] * b[1*3+1] + a[1*3+2] * b[2*3+1];
  r[1*3+2] = a[1*3+0] * b[0*3+2] + a[1*3+1] * b[1*3+2] + a[1*3+2] * b[2*3+2];
  r[2*3+0] = a[2*3+0] * b[0*3+0] + a[2*3+1] * b[1*3+0] + a[2*3+2] * b[2*3+0];
  r[2*3+1] = a[2*3+0] * b[0*3+1] + a[2*3+1] * b[1*3+1] + a[2*3+2] * b[2*3+1];
  r[2*3+2] = a[2*3+0] * b[0*3+2] + a[2*3+1] * b[1*3+2] + a[2*3+2] * b[2*3+2];
  for (var i = 0; i < 9; ++i)
    result[i] = r[i];
  return result;
}

// Rotate transformations for matrices in right-handed coordinate systems
m3.rotateX = function(result, a, angle) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationX(angle));
};

m3.rotateY = function(result, a, angle) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationY(angle));
};

m3.rotateZ = function(result, a, angle) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationZ(angle));
};

m3.rotateXY = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationXY(angles));
};

m3.rotateYX = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationYX(angles));
};

m3.rotateXZ = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationXZ(angles));
};

m3.rotateZX = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationZX(angles));
};

m3.rotateYZ = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationYZ(angles));
};

m3.rotateZY = function(result, a, angles) {
  // TODO: Optimize
  return m3.mul(result, a, m3.newRotationZY(angles));
};

// Module for setting 3x3 matrix values

// Axis-angle rotation matrix using the right hand rule
m3.newAxisRotation = function(axis, angle) {
  var
  // Convert rotation to quaternion representation
  length = Math.sqrt(axis[0]*axis[0], axis[1]*axis[1], axis[2]*axis[2]),
  halfAngle = angle * 0.5,
  sinHalfOverLength = Math.sin(halfAngle) / length,
  x = axis[0] * sinHalfOverLength,
  y = axis[1] * sinHalfOverLength,
  z = axis[2] * sinHalfOverLength,
  w = Math.cos(halfAngle),
  // Convert quaternion to matrix representation
  xx = x*x, xy = x*y, xz = x*z, xw = x*w,
  yy = y*y, yz = y*z, yw = y*w,
  zz = z*z, zw = z*w;
  return [
    1 - 2 * (yy + zz), 2 * (xy + zw),     2 * (xz - yw),
    2 * (xy - zw),     1 - 2 * (xx + zz), 2 * (yz + xw),
    2 * (xz + yw),     2 * (yz - xw),     1 - 2 * (xx + yy)];
};

// Matrix identity
m3.newIdentity = function() {
  return [
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0];
};

// Right handed rotation matrices
m3.newRotationX = function(angle) {
  var
  c = Math.cos(angle),
  s = Math.sin(angle);
  return [
    1.0, 0.0, 0.0,
    0.0, c,   s,
    0.0,-s,   c
  ]
};

m3.newRotationY = function(angle) {
  var
  c = Math.cos(angle),
  s = Math.sin(angle);
  return [
    c,   0.0,-s,
    0.0, 1.0, 0.0,
    s,   0.0, c
  ]
};

m3.newRotationZ = function(angle) {
  var
  c = Math.cos(angle),
  s = Math.sin(angle);
  return [
    c,   s,   0.0,
   -s,   c,   0.0,
    0.0, 0.0, 1.0
  ]
};

m3.newRotationXY = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c1     , 0.0,-s_     ,
    s1 * s_, c_ , c_ * c_,
    s_ * s_,-s_ , c_ * c_
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationX(angles[0]), m3.newRotationY(angles[1]));
};

m3.newRotationYX = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c,   s*s,-s*c,
    0.0, c,   s,
    s,  -s*c, c*c
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationY(angles[0]), m3.newRotationX(angles[1]));
};

m3.newRotationXZ = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c,   s,   0.0,
   -c*s, c*c, s,
    s*s,-s*c, c
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationX(angles[0]), m3.newRotationZ(angles[1]));
};

m3.newRotationZX = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c,  s*c, s*s,
   -s,  c*c, c*s,
    s,  0.0, c    
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationZ(angles[0]), m3.newRotationX(angles[1]));
};

m3.newRotationYZ = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c*c, c*s, -s,
    -s,  c,   0.0,
    s*c, s*s, c
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationY(angles[0]), m3.newRotationZ(angles[1]));
};

m3.newRotationZY = function(angles) {
  /* TODO: Optimize
  var
  c0 = Math.cos(angles[0]),
  s0 = Math.sin(angles[0]),
  c1 = Math.cos(angles[1]),
  s1 = Math.sin(angles[1]);
  return [
    c*c,   s,-c*s,
   -s*c,   c, s*s,
      s, 0.0,   c
  ];//*/
  var result = [0.0,0.0,0.0, 0.0,0.0,0.0, 0.0,0.0,0.0];
  return m3.mul(result, m3.newRotationZ(angles[0]), m3.newRotationY(angles[1]));
};

var m4 = gl.matrix4 = {};
// Module for setting 4x4 matrix values

// Axis-angle rotation matrix using the right hand rule
m4.newAxisRotation = function(axis, angle) {
  var
  // Convert rotation to quaternion representation
  length = Math.sqrt(axis[0]*axis[0], axis[1]*axis[1], axis[2]*axis[2]),
  halfAngle = angle * 0.5,
  sinHalfOverLength = Math.sin(halfAngle) / length,
  x = axis[0] * sinHalfOverLength,
  y = axis[1] * sinHalfOverLength,
  z = axis[2] * sinHalfOverLength,
  w = Math.cos(halfAngle),
  // Convert quaternion to matrix representation
  xx = x*x, xy = x*y, xz = x*z, xw = x*w,
  yy = y*y, yz = y*z, yw = y*w,
  zz = z*z, zw = z*w;
  return [
    1 - 2 * (yy + zz), 2 * (xy + zw),     2 * (xz - yw),      0,
    2 * (xy - zw),     1 - 2 * (xx + zz), 2 * (yz + xw),      0,
    2 * (xz + yw),     2 * (yz - xw),     1 - 2 * (xx + yy),  0,
    0,                 0,                 0,                  1];
};

// Matrix identity
m4.newIdentity = function() {
  return [
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0];
};

m4.newRows = function(r0, r1, r2, r3) {
  return [].concat(r0, r1, r2, r3);
}

m4.newColumns = function(c0, c1, c2, c3) {
  return [
    c0[0], c1[0], c2[0],c3[0],
    c0[1], c1[1], c2[1],c3[1],
    c0[2], c1[2], c2[2],c3[2],
    c0[3], c1[3], c2[3],c3[3]
  ];
}

// Right-handed orthogonal projection matrix
m4.newOrtho = function(left, right, bottom, top, near, far) {
  var x = left - right,
  y = bottom - top,
  z = near - far;
  return [
    -2.0 / x,           0.0,                0.0,              0.0,
    0.0,               -2.0 / y,            0.0,              0.0,
    0.0,                0.0,                2.0 / z,          0.0,
    (left + right) / x, (top + bottom) / y, (far + near) / z, 1.0
  ];
};

// Right-handed look-at matrix
m4.newLookAt = function(eye, target, up) {
  // TODO: See if it would be more efficient to try and build the matrix
  //       by rows instead of by columns as is done presently
  var x = MathMemoryPool.vector4[0], 
  y = MathMemoryPool.vector4[1],
  z = MathMemoryPool.vector4[2],
  w = MathMemoryPool.vector4[3];

  gl.vec3.sub(z, eye, target);
  gl.vec3.cross(x, up, z);

  // (probably best to normalize z and x after cross product for best numerical accuracy)
  gl.vec3.normalize(x, x);
  gl.vec3.normalize(z, z);

  // (no need to normalize y because x and z was already normalized)
  gl.vec3.cross(y, z, x);
  
  x[3] = -gl.vec3.dot(x, eye);
  y[3] = -gl.vec3.dot(y, eye);
  z[3] = -gl.vec3.dot(z, eye);
  w[0] = 0.0;
  w[1] = 0.0;
  w[2] = 0.0;
  w[3] = 1.0;
  return m4.newColumns(x,y,z,w);
};

})();


// Extend glQuery if it is defined
if (typeof glQuery !== 'undefined' && glQuery != null)
  for(var key in glQueryMath)
    if (glQuery[key] == null)
      glQuery[key] = glQueryMath[key];
return glQueryMath;

})();



/*
 * adt.js - Algebraic Data Types for JavaScript
 * adt.js is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 */
var adt = (function() {
"use strict";
  // Define a local copy of adt
  var
    isADT = function(data) {
      return Array.isArray(data) && typeof data['_tag'] === 'string';
    },
    isInterface = function(obj) {
      return typeof obj === 'function' && typeof obj['_eval'] === 'function';
    },
    init = function(selfProto, args) {
      var i, key, strA;
      for (i = 0; i < args.length; ++i) {
        var a = args[i];
        if (Array.isArray(a))
          init(selfProto, a);
        else if (typeof a === 'string' || typeof a === 'number') {
          if (a !== '_' && String(a).charAt(0) === '_')
            continue; // ignore constructors for private members starting with _
          else
            selfProto[a] = (function(tag) { return function() { return construct(tag, arguments); }; })(a);
        }
        else if (typeof a === 'object' || typeof a === 'function') {
          for (key in a)
            if (key !== '_' && key.charAt(0) === '_')
              continue; // ignore evaluators for private members starting with _
            else if (typeof(a[key]) === 'function')
              selfProto[key] = a[key];
            else
              selfProto[key] = (function(val){ return function() { return val; }; })(a[key]);
        }
        else
          continue; // TODO: WARNING: unidentified argument passed to adt
      }
    },
    adt = function() {
      // Arguments to this function can be either constructor names (strings or 
      // arrays of strings, numbers or arrays of numbers) or evaluators (dispatch tables or arrays of dispatch
      // tables with keys as deconstructors and values as dispatch functions)
      var selfProto = {};
      init(selfProto, arguments);
      return evaluators(selfProto);
    },
    // Get the internal [[Class]] property (or `Undefined` or `Null` for `(void 0)` and `null` respectively)
    getObjectType = function(data) {
      var str = Object.prototype.toString.call(data);
      return str.slice(str.indexOf(' ') + 1, str.length - 1);
    },
    getDataType = function(data) {
      if (isADT(data)) return 'ADT'; else return getObjectType(data);
    },
    getTypeTag = function(data) {
      if (isADT(data)) return data._tag; else return getObjectType(data);
    };
  adt.isADT = isADT;
  adt.isInterface = isInterface;
  adt.version = "3.0.0";  var construct = function(tag, args) {
    // Make a shallow copy of args and patch on the tag
    var data = [].slice.call(args, 0);
    data._tag = tag;
    return data;
  };
  /* TODO: Possibly expose it in the future...
  adt.construct = function(tag) {
    if (arguments.length < 1)
      throw "Incorrect number of arguments passed to `construct()`."
    return construct(tag, [].slice.call(arguments, 1));
  };*/

  // ADT evaluators common
  // ADT evaluators API (version 3)
  var 
    evaluators = function(selfProto) {
      var 
        tag,
        evaluators = function(){
          // TODO: Add a second private method called `_run` which includes composition/recursion etc as applied by external plugins.
          //       This would hopefully allow people to write generic higher-order functions that work together seamlesly.
          return evaluators._eval.apply(evaluators, arguments);
        };

      // Create an identity constructor for the fall through pattern if none was supplied
      if (typeof selfProto['_'] === 'undefined') {
        selfProto['_'] = function(){
          return this._datatype !== 'ADT'? arguments[0] : construct(this._tag, arguments);
        },
        evaluators['_'] = function(){ return selfProto['_'].apply(evaluators, arguments); };
      }
        
      // Add adt constructors / methods to the evaluators
      for (tag in selfProto)
        switch(tag) {
          case 'eval':
            continue;  // Warning? trying to overide standard functions
          default:
            if (tag !== 'eval') {
              if (typeof selfProto[tag] === 'function')
                // Custom evaluators
                evaluators[tag] = (function(tag){ return function(){ return selfProto[tag].apply(evaluators, arguments); }; })(tag);
              else 
                // Constant constructor (return the constant value)
                evaluators[tag] = (function(tag){ return function(){ return selfProto[tag]; }; })(tag);
            }
        }

      /* METHOD 1 (FAST DISPATCH - TODO) Generate pattern matcher + dispatch function
      var 
        patternMatcher = "\"use strict\";\n",
        merge = function(dict,k,v) { return dict[k] ? dict[k].push(v) : [v]; },
        tuples = {},
        variableTuples = false, // (Are there variable length tuples in the pattern?)
        prevLength = null,
        tuple,
        i,
        generateTupleMatcher = function(){
        };
      for (tag in evaluators)
        switch(tag) {
          case '_eval': continue;
          default: 
            tuple = tag.split(',');
            merge(tuples, tuple.length, tuple);
            variableTuples = (prevLength !== null && prevLength !== tuple.length);
            prevLength = tuple.length;
        }
      if (variableTuples)
        patternMatcher.concat("switch(arguments.length){\n")
      for (i in tuples) {
        if (variableTuples)
          patternMatcher.concat("case " + i + ":\n");
        patternMatcher.concat(generateTupleMatcher(tuples[i]));        
      }
      if (variableTuples)
        patternMatcher.concat(
          "default:\n"
          + "return false;\n"
          + "}\n")
      //*/

      //* METHOD 2 (FAST COMPILATION)
      // Tokenize patterns into (length, (pattern,tuple))
      var 
        appendAt = function(dict,k,v) { 
          if (dict[k]) dict[k].push(v); else dict[k] = [v]; 
        },
        pattern,
        patternTuples = {};
      for (pattern in evaluators)
        switch(pattern) {
          case '_eval': continue;
          default: 
            var tuple = pattern.split(',').map(function(s) { 
              return s.split(' ').filter(function(s) { return s !== ''; }); 
            });
            appendAt(patternTuples, tuple.length, [pattern, tuple]);
        }

      // Order patternTuples in order from most specific to most general (order of patterns in evaluators cannot be relied upon)
      (function(){
        var l, pt;
        for (l in patternTuples) {
          pt = patternTuples[l];
          pt.sort(function(a,b) {
            // Pre-condition: a[1].length == b[1].length (patternTuples are already grouped by length)
            var i,j;
            for (i = 0; i < a[1].length; ++i) {
              // Calculate relative generality of the two patterns
              // 1. The most specific constructor is always the one with the largest number of arguments specified, even if they are wildcards...
              //    I.e. The most general constructor is always the one with the fewest arguments specified...
              if (a[1][i].length !== b[1][i].length)
                return a[1][i].length > b[1][i].length? -1 : 1;
              // 2. Wild card patterns > ADT > Everything else
              for (j = 0; j < a[1][i].length; ++j) {
                if (a[1][i][j] !== '_' && b[1][i][j] === '_')
                  return -1; // a less general than b
                if (a[1][i][j] === '_' && b[1][i][j] !== '_')
                  return 1; // a more general than b
                if (a[1][i][j] !== 'ADT' && b[1][i][j] === 'ADT')
                  return -1; // a less general than b
                if (a[1][i][j] === 'ADT' && b[1][i][j] !== 'ADT')
                  return 1; // a more general than b
              }
            }
            // 3. For the remainder, simply sort patterns alphabetically
            return a[0] < b[0]? -1 : 1;
          });
        }
      })();

      var 
        matchShallow = function(tag, datum) {
          return tag === getTypeTag(datum) || tag == '_' || (isADT(datum) && tag == 'ADT');
        },
        matchCons = function(consPattern, datum) {
          // Pre-condition: consPattern.length > 0
          // The function returns a list of unboxed arguments to send to the evaluator
          var i;
          if (isADT(datum)) {
            if (consPattern[0] == '_')
              return datum.slice(0);
            if (consPattern[0] !== datum._tag)
              return null;
            if (consPattern.length === 1)
              return datum.slice(0);
            for (i = 0; i < datum.length; ++i)
              if (!matchShallow(consPattern[i + 1], datum[i]))
                return null;
            return datum.slice(0);
          }
          else if (consPattern.length === 1 
              && (consPattern[0] === getObjectType(datum) || consPattern[0] === '_'))
            return [datum];
          return null;
        },
        matchTuple = function(tuplePattern, args) {
          // Pre-condition: tuplePattern.length == args.length
          var 
            i,
            d,
            data = [];
          for (i = 0; i < tuplePattern.length; ++i) {
            d = matchCons(tuplePattern[i], args[i]);
            if (d == null)
              return null;
            data = data.concat(d);
          }
          return {
            data: data,
            pattern: tuplePattern.map(function(s){ return s.join(' ') }).join(','),
            datatype: Array.prototype.map.call(args, getDataType).join(','),
            tag: Array.prototype.map.call(args, getTypeTag).join(','),
          };
        },
        matcherFunc = function() {
          var i, m, pt = patternTuples[arguments.length];
          if (pt != null)
            for (i = 0; i < pt.length; ++i) {
              m = matchTuple(pt[i][1], arguments);
              if (m != null) {
                m.eval = evaluators[pt[i][0]];
                // TODO: m.exactPattern = pt[i][0];
                return m;
              }
            }
          return null;
        };
      //*/

      evaluators._eval = function() {
        // Determine if the data is a construction (built by a constructor)
        var i,
          tags = [],
          dataTypes = [];
        
        var m = matcherFunc.apply((void 0), arguments);
        if (m == null) {
          evaluators._pattern = '_';
          evaluators._tag = Array.prototype.map.call(arguments, getTypeTag).join(',');
          evaluators._datatype = Array.prototype.map.call(arguments, getDataType).join(',');
          var data = Array.prototype.reduce.call(arguments, function(a,b){ return a.concat(isADT(b)? b : [b]); }, []);
          return evaluators._.apply(evaluators, data);
        }
        evaluators._pattern = m.pattern;
        evaluators._tag = m.tag;
        evaluators._datatype = m.datatype;
        return m.eval.apply(evaluators, m.data);
      };
      return evaluators;
    };
  // Automatically create constructors for any dispatch table
  adt.constructors = function(obj) {
    var key, keys = [];
    if (obj != null)
      for (key in obj)
        keys.push(key);
    return adt.apply(null, keys);
  };

  var applyWith = function(f){ return function(a){ return f(a) }; };
  adt.map = function(fadt, data){ return data.map(applyWith(fadt)); };
  adt.compose = function() {
    var i, a = arguments, f, fi, key, tags;
    if (a.length === 0)
      return adt();
    f = typeof a[0] === 'function'? a[0] : adt(a[0]);
    for (i = 1; i < a.length; ++i) {
      fi = typeof a[i] === 'function'? a[i] : adt(a[i]);
      f = (function(fi, f){ return function(){ return fi(f.apply(this, arguments)); }; })(fi, f);
    }
    // Get all the tags of all of the interfaces
    tags = [];
    for (i = 0; i < a.length; ++i)
      if (typeof a[i] === 'object' || isInterface(a[i]))
        for (key in a[i])
          if (key.length > 0 && key[0] !== '_')
            tags.push(key);
    // Add all evaluators to the interface
    f._eval = f;
    for (i = 0; i < tags.length; ++i)
      f[tags[i]] = (function(f, tag){ 
        return function(){ return f(construct.apply(null, [tag].concat(arguments))); };
      })(f, tags[i]);
    return f;
  };
  adt.recursive = function(f) {
    if (typeof f !== 'function')
      throw "Expected a function or ADT interface in adt.recursive"
    var self = isInterface(f)? f : adt({_: f});

    var recurse = function (data) {
        var i, results = [], subResult;
        if (!isADT(data)) {
          return self(data);
        }
        for (i = 0; i < data.length; ++i) {
          subResult = recurse(data[i]);
          //if (typeof subResult !== 'undefined')
          results.push(subResult);
        }
        // TODO: Take into account pattern matching requirements...
        return self(construct(data._tag, results));
    };
    // Assign all the methods in the interface to the recursive interface too
    // TODO: But shouldn't these methods also run recursively?
    for (var key in self)
      recurse[key] = self[key];
    return recurse;
  };
  // Create ADT's from an object's own property names (both enumerable + non-enumerable)
  adt.own = function() {
    var i, j, arg, names, key, dispatchTable = {};
    for (i = 0; i < arguments.length; ++i) {
      arg = arguments[i];
      names = Object.getOwnPropertyNames(arg);
      for (j = 0; j < names.length; ++j) {
        key = names[j];
        dispatchTable[key] = arg[key];
      }
    }
    return adt(dispatchTable);
  }
  adt.own.constructors = function(obj) {
    var i, names = [];
    for (i = 0; i < arguments.length; ++i)
      names.push(Object.getOwnPropertyNames(arguments[i]));
    return adt.apply(null, Array.prototype.concat.apply([], names));
  };

  adt.serialize = function(data){
    var 
      escapeString = function(str, escapes) {
        var 
          i, 
          result = '',
          replacement,
          escapes = escapes || {
            // Single-character escape codes (JavaScript -> Haskell)
            '\0': '\\0',    // null character
            //'\a': '\\a',  // alert            (n/a in JavaScript)
            '\b': '\\b',    // backspace
            '\f': '\\f',    // form feed
            '\n': '\\n',    // newline (line feed)
            '\r': '\\r',    // carriage return
            '\t': '\\t',    // horizontal tab
            '\v': '\\v',    // vertical tab
            '\"': '\\\"',   // double quote
            //'\&': '\\&',  // empty string     (n/a in JavaScript)
            '\'': '\\\'',   // single quote
            '\\': '\\\\'    // backslash
          };
        for (i = 0; i < str.length; ++i) {
          replacement = escapes[str[i]];
          result += (replacement == null? str[i] : replacement);
        }
        return result;
      },
      escapes = {
        '\\': '\\\\',
        '\"': '\\\"',
        '\'': '\\\'',
        '\t': '\\t',
        '\r': '\\r',
        '\n': '\\n',
        ' ': '\\ ',
        ',': '\\,',
        '(': '\\(',
        ')': '\\)',
        '[': '\\[',
        ']': '\\]',
        '{': '\\{',
        '}': '\\}'
      },
      //SerializedADT = adt('SerializedADT').SerializedADT,
      serializeTagStruct = function(tag, args) {
        var
            i,
            str = escapeString(tag, escapes),
            parens;
          for (i = 0; i < args.length; ++i) {
            parens = isADT(args[i]) && args[i].length > 0;
            str += ' ' + (parens? '(' : '') + serializeEval(args[i]) + (parens? ')' : '');
          }
          return str;
      },
      serializeBuiltinEval = adt({
        Array: function(a) { 
          var 
            i,
            str ='[';
          if (a.length > 0)
            for (i = 0;; ++i) {
              str += serializeEval(a[i]);
              if (i === a.length - 1)
                break;
              str += ',';
            }
          str += ']'; 
          return str;
        },
        Object: function(a) {
          var 
            i,
            k = Object.keys(a),
            str = '{';
          if (k.length > 0)
            for (i = 0;; ++i) {
              str += escapeString(k[i], escapes) + ' = ' + serializeEval(a[k[i]]);
              if (i === k.length - 1)
                break;
              str += ',';
            }
          str += '}';
          return str;
        }
      }),
      // TODO: shorten this by using `compose`?
      serializeEval = adt({
        String: function(a) { return this._datatype === 'ADT'? serializeTagStruct('String', arguments) : '"' + a + '"'; },
        Number: function(a) { return this._datatype === 'ADT'? serializeTagStruct('Number', arguments) : String(a); },
        Boolean: function(a) { return this._datatype === 'ADT'? serializeTagStruct('Boolean', arguments) : (a? 'True' : 'False'); },
        // TODO: what about nested records, arrays and ADT's?
        Array: function(a) { return this._datatype === 'ADT'? serializeTagStruct('Array', arguments) : serializeBuiltinEval(a); },
        Arguments: function(a) { return this._datatype === 'ADT'? serializeTagStruct('Arguments', arguments) : this([].slice.call(a, 0)); },
        // TODO: what about adt's nested inside the record...
        Object: function(a) { return this._datatype === 'ADT'? serializeTagStruct('Object', arguments) : serializeBuiltinEval(a); },
        //SerializedADT: function(a) { return '(' + a + ')'; },
        _: function() {
          if (this._datatype !== 'ADT')
            // Currently unsupported: RegExp, Null, Undefined, Math, JSON, Function, Error, Date
            throw "Unsupported JavaScript built-in type `" + this._datatype + "` in `adt.serialize`.";
          return serializeTagStruct(this._tag, arguments);
        }
      });
    return serializeEval(data);
  };
  var 
    unescapeString = function(str) {
      var
        i,
        result = '',
        escapes = {
          // Single-character escape codes (Haskell -> JavaScript)
          //'0': '\0',    // null character   (handled by numeric escape codes)
          'a': '',        // alert            (n/a in javaScript)
          'b': '\b',      // backspace
          'f': '\f',      // form feed
          'n': '\n',      // newline (line feed)
          'r': '\r',      // carriage return
          't': '\t',      // horizontal tab
          'v': '\v',      // vertical tab
          '\"': '\"',     // double quote
          '&': '',        // empty string
          '\'': '\'',     // single quote
          '\\': '\\'      // backslash
        };
        /* ASCII control code abbreviations (Haskell -> JavaScript)
        \NUL  U+0000  null character
        \SOH  U+0001  start of heading
        \STX  U+0002  start of text
        \ETX  U+0003  end of text
        \EOT  U+0004  end of transmission
        \ENQ  U+0005  enquiry
        \ACK  U+0006  acknowledge
        \BEL  U+0007  bell
        \BS U+0008  backspace
        \HT U+0009  horizontal tab
        \LF U+000A  line feed (newline)
        \VT U+000B  vertical tab
        \FF U+000C  form feed
        \CR U+000D  carriage return
        \SO U+000E  shift out
        \SI U+000F  shift in
        \DLE  U+0010  data link escape
        \DC1  U+0011  device control 1
        \DC2  U+0012  device control 2
        \DC3  U+0013  device control 3
        \DC4  U+0014  device control 4
        \NAK  U+0015  negative acknowledge
        \SYN  U+0016  synchronous idle
        \ETB  U+0017  end of transmission block
        \CAN  U+0018  cancel
        \EM U+0019  end of medium
        \SUB  U+001A  substitute
        \ESC  U+001B  escape
        \FS U+001C  file separator
        \GS U+001D  group separator
        \RS U+001E  record separator
        \US U+001F  unit separator
        \SP U+0020  space
        \DEL  U+007F  delete
        */
        /* Control-with-character escapes (Haskell -> JavaScript)
        \^@ U+0000  null character
        \^A through \^Z U+0001 through U+001A control codes
        \^[ U+001B  escape
        \^\ U+001C  file separator
        \^] U+001D  group separator
        \^^ U+001E  record separator
        \^_ U+001F  unit separator
        */
      for (i = 0; i < str.length - 1; ++i) {
        if (str[i] !== '\\')
          result += str[i];
        else {
          var 
            s = str[i + 1],
            replacement = escapes[s],
            numStr = null,
            radix = null;
          if (replacement != null) {
            result += replacement;
            ++i;
            continue;
          }
          // Parse numeric escapes
          if (s >= '0' && s <= '9') {
            numStr = (/[0-9]*/).exec(str.slice(i + 1))[0];
            radix = 10; 
          } else if (s == 'x') {
            numStr = (/[0-9a-f]*/i).exec(str.slice(i + 2))[0];
            radix = 16;
          } else if (s == 'o') {
            numStr = (/[0-7]*/).exec(str.slice(i + 2))[0];
            radix = 8;
          }
          if (numStr != null && numStr.length > 0) {
            var 
              num = 0,
              j;
            for (j = 0; j < numStr.length; ++j) {
              num *= radix;
              num += parseInt(numStr[j], radix);
            }
            result += String.fromCharCode(num);
            i += numStr.length + (s == 'x' || s == 'o'? 1 : 0);
            continue;
          }
          // Direct single-character escape
          result += str[i + 1];
          ++i;
        }
      }
      // Add the last character if it wasn't escaped
      return i === str.length - 1? result + str[str.length - 1] : result;
    },
    eatWhiteSpace = function(str) {
      for (var i = 0; i < str.length; ++i) {
        switch (str[i]) {
          case ' ':
          case '\n': 
          case '\r': 
          case '\t':  
            continue;
        }
        return str.slice(i);
      }
      return '';
    },

    lexString = function(str) {
      var i, searchIndex = 1;
      // pre-condition: str.length > 1
      while (true) {
        searchIndex = str.indexOf(str[0], searchIndex);
        if (searchIndex === -1)
          throw "No closing quotation mark was found for the string starting with " + str.slice(0, Math.min(5, str.length)) + "...";
        // Check if there's an odd number of escape characters before the quotation mark character
        for (i = searchIndex - 1; i >= 0; --i)
          if (str[i] !== '\\') {
            if ((searchIndex - i) & 1 === 1) // There is an even number of slashes (or none)
              return { head: str.slice(0, searchIndex + 1), tail: str.slice(searchIndex + 1) };
            else // There is an odd number of slashes, so continue searching
              break;
          }
        searchIndex += 1;
      }
    },
    lex = function(str) {
      var 
        nextWhiteSpace,
        skip = 1;
      str = eatWhiteSpace(str);
      if (str.length === 0)
        return ['','']; // empty string
      switch (str[0]) {
        case '(':
        case ')':
        case '[':
        case ']':
        case '{':
        case '}':
        case '=':
        case ',': 
          return { head: str[0], tail: str.slice(1) };
        case '\"': 
        case '\'':
          return lexString(str);
        case '\\':
          skip = 2;
      }
      for (var i = skip; i < str.length; ++i) {
        switch (str[i]) {
          case '(':
          case ')':
          case '[':
          case ']':
          case '{':
          case '}':
          case '=':
          case ',':
          case ' ':
          case '\n':
          case '\r':
          case '\t':
            return { head: str.slice(0, i), tail: str.slice(i) };
          case '\"': 
          case '\'':
            throw "Illegal quote character `" + str[i] + "` found in lexeme. Quotes should be escaped using `\\" + str[i] + "`."
          case '\\':
            if (i === str.length - 1)
              throw "Escape character `\\` found at the end of the input string, followed by nothing."
            ++i; // skip the next character
        }
      }
      return { head: str, tail: "" };
    },
    parseADTTail = function(head, input) {
      var
        tag = unescapeString(head),
        tail = input,
        args = [];
      
      while (tail.length > 0)
        switch (tail[0]) {
          // Look ahead for terminating characters
          case ')':
          case ']':
          case '}':
          case ',':
            return { result: construct(tag, args), tail: tail };
          default:
            var parseResult = parseArgument(tail);
            if (parseResult == null)
              continue;
            args.push(parseResult.result);
            tail = parseResult.tail;
        }
      return { result: construct(tag, args), tail: tail };
    },
    parseArrayTail = function(input) {
      if (input.length < 2)
        throw "No data supplied after array opening bracket `[`.";
      var 
        tail = input,
        commaCount = 0,
        array = [];
      while (tail.length > 0)
        switch (tail[0]) {
          case ')':
          case '}':
            throw "Invalid character `" + tail[0] + "` found in the data."
          case ',':
            ++commaCount;
            if (commaCount < array.length)
              array.push(undefined);
            // post-condition: array.length === commaCount
            tail = tail.slice(1);
            continue;
          case ']':
            return { result: array, tail: tail.slice(1) };
          default:
            if (commaCount < array.length)
              throw "Expected `,` separator between array elements."
            var parseResult = parse(tail);
            if (parseResult == null)
              continue;
            array.push(parseResult.result);
            tail = parseResult.tail;
        }
      throw "Could not find the closing bracket for the array `[" + input.slice(0, Math.max(input.length,4)).join('') + "...`";
      // TODO...
      //return tail;
    },
    parseRecordTail = function(input) {
      if (input.length < 2)
        throw "No data supplied after record opening curly bracket `{`.";
      var 
        tail = input,
        commaCount = 0,
        record = {},
        lastKey = null;
      while (tail.length > 0)
        switch (tail[0]) {
          case ')':
          case ']':
            throw "Invalid character `" + tail[0] + "` found in the data."
          case ',':
            ++commaCount;
            if (commaCount < record.length)
              record.push(undefined);
            // post-condition: record.length === commaCount
            tail = tail.slice(1);
            continue;
          case '}':
            return { result: record, tail: tail.slice(1) };
          default:
            if (commaCount < record.length)
              throw "Expected `,` separator between record elements."
            var parseResult = parseRecordKeyVal(tail);
            if (parseResult == null)
              continue;
            record[parseResult.result[0]] = parseResult.result[1];
            tail = parseResult.tail;
        }
      throw "Could not find the closing curly bracket for the record `{" + input.slice(0, Math.max(input.length,4)).join('') + "...`";
    },
    parseRecordKeyVal = function(input) {
      if (input.length < 3)
        throw "Expected \'key = val\' in record syntax."
      var 
        key = unescapeString(input[0]);
      if (input[1] != '=')
        throw "Expected \'key = val\' in record syntax."
      var parseResult = parse(input.slice(2));
      return { result: [key,parseResult.result], tail: parseResult.tail };
    },
    parseParensTail = function(input) {
      if (input.length < 1)
        throw "No data after opening parenthesis.";
      var head = input[0], tail = input.slice(1);
      if (head.length === 0)
        return parseParensTail(tail); // no argument (two whitespace characters next to each other causes this)
      switch (head) {
        case '(':
          throw "Invalid double opening parentheses `((` found."
        case ')':
          throw "No data supplied after opening parenthesis `(`. The unit type, (), is not supported.";
        case '[':
        case ']':
        case '{':
        case '}':
        case ',':
        case '\"':
        case '\'':
          // Note that primitives are not allowed inside `(...)`
          throw "Invalid character `" + head + "` found after opening parenthesis."
      }
      // Parse the ADT constructor and arguments
      var parseResult = parseADTTail(head, tail);
      if (parseResult.tail.length === 0 || parseResult.tail[0] !== ')')
        throw "Could not find the closing parenthesis for the data `(" + input.slice(0, Math.max(input.length,4)).join(' ') + "...`";
      return { result: parseResult.result, tail: parseResult.tail.slice(1) };
    },
    parsePrimitive = function(head, input) {
      switch (head) {
        case '(':
          return parseParensTail(input);
        case '[':
          return parseArrayTail(input);
        case '{':
          return parseRecordTail(input);
      }
      switch (head[0]) {
        case '\"':
          //pre-condition: head[head.length - 1] === '\"'
          //pre-condition: head.length > 1
          return { result: unescapeString(head.slice(1, head.length - 1)), tail: input };
        case '\'':
          //pre-condition: head[head.length - 1] === '\"'
          //pre-condition: head.length > 1
          return { result: unescapeString(head.slice(1, head.length - 1)), tail: input };
      }
      var numberCast = Number(head);
      if (!isNaN(numberCast))
        return { result: numberCast, tail: input };
      return null;
    },
    parseArgument = function(input) {
      // This is almost identical to parse, except it only allows argumentless ADT constructors
      if (input.length == 0)
        return null;
      // pre-condition: input.length > 0
      var head = input[0], tail = input.slice(1);
      if (head.length === 0)
        return parseArgument(tail); // no argument (two whitespace characters next to each other causes this)
      // Try to parse a primitive from the stream
      var parseResult = parsePrimitive(head, tail);
      if (parseResult != null)
        return parseResult;
      // The next token is not a primitive type, so it must be a constructor tag
      var tag = unescapeString(head);
      return { result: construct(tag, []), tail: tail };
    },
    parse = function(input) {
      if (input.length == 0)
        return null;
      var head = input[0], tail = input.slice(1);
      if (head.length === 0)
        return parse(tail); // no argument (two whitespace characters next to each other causes this)
      // Try to parse a primitive from the stream
      var parseResult = parsePrimitive(head, tail);
      if (parseResult != null)
        return parseResult;
      // The next token is not a primitive type, so it must be a constructor tag
      return parseADTTail(head, tail);
    };
  adt.deserialize = function(str){
    var
      lexemes = [],
      lexState = { head: '', tail: str },
      stack = [];
    while (lexState.tail.length > 0) {
      lexState = lex(lexState.tail);
      lexemes.push(lexState.head);
    }
    // Remove all empty lexemes from the start of the array
    while (lexemes.length > 0 && lexemes[0].length == 0)
      lexemes = lexemes.slice(1);
    // Test whether the list of lexemes is empty (the string was empty or whitespace only)
    if (lexemes.length == 0)
      return;
    // Allow lisp style constructors with starting and ending parentheses
    if (lexemes[0] === '(')
      if (lexemes[lexemes.length - 1] !== ')') {
        lexemesStr = lexemes.join(' ');
        throw "Optional opening parenthesis used for the data " + lexemesStr.slice(0, Math.min(10, lexemesStr.length)) + "... but could not find the closing parenthesis.";
      }
    return parse(lexemes).result;
    // post-condition: parse(lexemes) != null (because all empty lexemes at the beginning were explicitly removed)
    // post-condition: parse(lexemes).tail.length === 0
  };
//*/



/*
  var 
    lexADT()
  adt.deserialize = function(str) {
    var
      head,
      tail,
      result;
    if (lexemes.length === 0)
      return;

    head = lexemes[0];
    tail = lexemes.slice(1);
    result = deserializeWithKey(0, head, tail);
    // post-condition: result[1].length === 0
    return result[0];
  };
*/
  // Export adt to a CommonJS module if exports is available
  if (typeof(exports) !== "undefined" && exports !== null)
    module.exports = adt;
  return adt;
})();



/*
 * adt-html.js - Algebraic Data Types for JavaScript
 * adt-html.js is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 * Use it in combination with https://github.com/rehno-lindeque/adt.js
 */
var adt = adt || (typeof require === 'function'? require('adt.js') : {}), 
html = (function() {
"use strict";
  // Using the html5 list of tags from (http://joshduck.com/periodic-table.html)
  // Other html api's should probably be in separate libraries? (xhtml, html4 etc)
  var
    _cons = adt(
      // Root element
      'html', 
      // Metadata and scripting
      'head','title','meta','base','link','style','noscript','script',
      // Text-level semantics
      'span','a','rt','rp','dfn','abbr','q','cite','em','time','var','samp','i',
      'b','sub','sup','small','strong','mark','ruby','ins','del','bdi','bdo',
      's','kbd','wbr','code',
      // Grouping content
      'br','hr','figcaption','figure','p','ol','ul','li','div','pre',
      'blockquote','dl','dt','dd',
      // Forms
      'fieldset','meter','legend','label','input','textarea','form','select',
      'optgroup','option','output','button','datalist','keygen','progress',
      // Document sections
      'body','aside','address','h1','h2','h3','h4','h5','h6','section','header',
      'nav','article','footer','hgroup',
      // Tabular data
      'col','colgroup','caption','table','tr','td','th','tbody','thead','tfoot',
      // Interactive elements
      'menu','command','summary','details',
      // Embedding content
      'img','area','map','embed','object','param','source','iframe','canvas',
      'track','audio','video'
    ),
    _eval = adt({ _: function(attributes) {
        var el = document.createElement(this._tag);
        for (var i = 0; i < arguments.length; ++i)
          // Check if the argument is a DOM node
          if (arguments[i].nodeType)
            el.appendChild(arguments[i]);
          else if (typeof arguments[i] === 'string')
            el.appendChild(document.createTextNode(arguments[i]));
        if (typeof attributes === 'object' && typeof attributes.nodeType === 'undefined') {
          for (var key in attributes)
            el.setAttribute(key, attributes[key]);
        }
        return el;
      }
    }),
    html = (typeof adt.compose === 'undefined')?
      function(){ throw "`adt.compose()` is needed in order to use html as a function."; }
      : adt.compose(_eval, _cons);
    html.cons = _cons;
    html.eval = _eval;
  // Export html to a CommonJS module if exports is available
  if (typeof module !== "undefined" && module !== null)
    module.exports = html;
  return html;
})();


/*
 * Copyright 2013, CircuitHub.com
 */
var parameterize = parameterize || {}; /* Redeclaring parameterize is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */
(function(){
var originalRequire = this.require || (void 0);


(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle) {
        modules[key] = bundle[key];
        var ext = key.split('.').pop();
        if (ext.indexOf('/') === -1 && ext.length < key.length)
          modules[key.slice(0,-ext.length - 1)] = bundle[key];
      }
    };
  }
  return this.require.define;
}).call(this)({"get.js": function(exports, require, module) {// Generated by CoffeeScript 1.4.0
var parameterReader, readParameter, readTolerance, readToleranceWith, readUnit,
  __slice = [].slice;

readUnit = {
  real: function(els) {
    return Number(els[0].value);
  },
  integer: function(els) {
    return Math.round(readUnit.real(els));
  },
  natural: function(els) {
    return Math.max(0, Math.round(readUnit.integer(els)));
  },
  meter: function(els) {
    return readUnit.real(els);
  },
  meter2: function(els) {
    return [readUnit.meter([els[0]]), readUnit.meter([els[1]])];
  },
  meter3: function(els) {
    return [readUnit.meter([els[0]]), readUnit.meter([els[1]]), readUnit.meter([els[2]])];
  },
  degree: function(els) {
    return readUnit.real(els);
  }
};

readParameter = {
  real: readUnit.real,
  dimension1: readUnit.meter,
  dimension2: readUnit.meter2,
  dimension3: readUnit.meter3,
  vector2: readUnit.meter2,
  vector3: readUnit.meter3,
  point2: readUnit.meter2,
  point3: readUnit.meter3,
  pitch1: readUnit.meter,
  pitch2: readUnit.meter2,
  pitch3: readUnit.meter3,
  angle: readUnit.degree,
  polar: function(els) {
    return [readUnit.meter([els[0]]), readUnit.degree([els[1]])];
  },
  cylindrical: function(els) {
    return [readUnit.meter([els[0]]), readUnit.degree([els[1]]), readUnit.meter([els[2]])];
  },
  spherical: function(els) {
    return [readUnit.meter([els[0]]), readUnit.degree([els[1]]), readUnit.degree([els[2]])];
  },
  integer: readUnit.integer,
  natural: readUnit.natural,
  latice1: readUnit.natural,
  latice2: function(els) {
    return [readUnit.natural([els[0]]), readUnit.natural([els[1]])];
  },
  latice3: function(els) {
    return [readUnit.natural([els[0]]), readUnit.natural([els[1]]), readUnit.natural([els[2]])];
  },
  boolean: function(els) {
    return Boolean(els[0].checked);
  },
  option: function(els) {
    return els[0].options[els[0].selectedIndex].value;
  }
};

readToleranceWith = {
  '1': function(f) {
    return function(els) {
      return {
        min: f([els[0]]),
        max: f([els[1]])
      };
    };
  },
  '2': function(f) {
    return function(els) {
      return {
        min: [f([els[0]]), f([els[2]])],
        max: [f([els[1]]), f([els[3]])]
      };
    };
  },
  '3': function(f) {
    return function(els) {
      return {
        min: [f([els[0]]), f([els[2]]), f([els[4]])],
        max: [f([els[1]]), f([els[3]]), f([els[5]])]
      };
    };
  }
};

readTolerance = {
  real: readToleranceWith['1'](readUnit.real),
  dimension1: readToleranceWith['1'](readUnit.meter),
  dimension2: readToleranceWith['2'](readUnit.meter),
  dimension3: readToleranceWith['3'](readUnit.meter),
  vector2: readToleranceWith['2'](readUnit.meter),
  vector3: readToleranceWith['3'](readUnit.meter),
  point2: readToleranceWith['2'](readUnit.meter),
  point3: readToleranceWith['3'](readUnit.meter),
  pitch1: readToleranceWith['1'](readUnit.meter),
  pitch2: readToleranceWith['2'](readUnit.meter),
  pitch3: readToleranceWith['3'](readUnit.meter),
  angle: readToleranceWith['1'](readUnit.degree),
  polar: function(els) {
    return [(readToleranceWith['1'](readUnit.meter))(els.slice(0, 2)), (readToleranceWith['1'](readUnit.degree))(els.slice(2))];
  },
  cylindrical: function(els) {
    return [(readToleranceWith['1'](readUnit.meter))(els.slice(0, 2)), (readToleranceWith['1'](readUnit.degree))(els.slice(2, 4)), (readToleranceWith['1'](readUnit.meter))(els.slice(4))];
  },
  spherical: function(els) {
    return [(readToleranceWith['1'](readUnit.meter))(els.slice(0, 2)), (readToleranceWith['1'](readUnit.degree))(els.slice(2, 4)), (readToleranceWith['1'](readUnit.degree))(els.slice(4))];
  }
};

parameterReader = adt({
  Array: function(array) {
    return function(result, it) {
      var a, _i, _len;
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        a = array[_i];
        (parameterReader(a))(result, it);
      }
    };
  },
  parameters: function() {
    var description, params;
    description = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return this(params);
  },
  section: function() {
    var heading, params;
    heading = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return this(params);
  },
  tolerance: function() {
    var tolerances;
    tolerances = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return function(result, it) {
      var reader, t, _i, _len;
      reader = function(param) {
        return function(result, it) {
          var el;
          el = it.nextNode();
          return result[el.getAttribute('data-param-id')] = readTolerance[param._tag](el.querySelectorAll("input"));
        };
      };
      for (_i = 0, _len = tolerances.length; _i < _len; _i++) {
        t = tolerances[_i];
        (reader(t))(result, it);
      }
    };
  },
  _: function() {
    var tag;
    tag = this._tag;
    return function(result, it) {
      var el;
      el = it.nextNode();
      result[el.getAttribute('data-param-id')] = readParameter[tag](el.querySelectorAll("input,select"));
    };
  }
});

module.exports = function(formElement, parameters) {
  var it, matches, reader, result, selector;
  matches = function() {
    var args, node, _ref, _ref1;
    node = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return ((_ref = (_ref1 = node.matches) != null ? _ref1 : node.mozMatchesSelector) != null ? _ref : node.webkitMatchesSelector).apply(node, args);
  };
  selector = ".parameter";
  it = document.createNodeIterator(formElement, NodeFilter.SHOW_ELEMENT, {
    acceptNode: function(node) {
      if (matches(node, selector)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_SKIP;
      }
    }
  });
  reader = parameterReader(parameters);
  result = {};
  reader(result, it);
  return result;
};
}, "html.js": function(exports, require, module) {// Generated by CoffeeScript 1.4.0
var __slice = [].slice;

(function(adt, html) {
  var escapeAttrib, groupByTolerance, labeledCompositeTolerance, labeledElements, labeledInput, labeledInputs, labeledTolerance, resolveMeta, shortLabelLength, toleranceHTML, wrap, wrapComposite;
  shortLabelLength = 5;
  escapeAttrib = function(str) {
    return (String(str)).replace(/['"]/gi, "`");
  };
  groupByTolerance = function(as) {
    var a, copyA, gs, _i, _len, _ref, _ref1;
    gs = [];
    for (_i = 0, _len = as.length; _i < _len; _i++) {
      a = as[_i];
      if (a._tag === 'tolerance' && ((_ref = gs[gs.length - 1]) != null ? _ref._tag : void 0) === 'tolerance') {
        (_ref1 = gs[gs.length - 1]).push.apply(_ref1, a);
      } else {
        copyA = __slice.call(a);
        copyA._tag = a._tag;
        gs.push(copyA);
      }
    }
    return gs;
  };
  wrap = function() {
    var args, id;
    id = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return html.div.apply(html, [{
      "class": "parameter",
      'data-param-id': id
    }].concat(__slice.call(args)));
  };
  wrapComposite = function() {
    var args, classes, description, id;
    id = arguments[0], classes = arguments[1], description = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
    return html.div.apply(html, [{
      "class": "parameter param-composite " + classes,
      'data-param-id': id,
      title: escapeAttrib(description)
    }].concat(__slice.call(args)));
  };
  labeledElements = function() {
    var elements, label;
    label = arguments[0], elements = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return html.label.apply(html, [{
      "class": "param-label"
    }, html.span({
      "class": "param-label-text"
    }, String(label))].concat(__slice.call(elements)));
  };
  labeledInput = function(label, value) {
    return labeledElements(label, html.input({
      "class": "param-input",
      type: 'text',
      value: String(value)
    }));
  };
  labeledInputs = function(n, labels, values, shortLabels) {
    var i, _i, _results;
    if (shortLabels == null) {
      shortLabels = false;
    }
    if (!shortLabels) {
      _results = [];
      for (i = _i = 0; 0 <= n ? _i < n : _i > n; i = 0 <= n ? ++_i : --_i) {
        _results.push(labeledInput(labels[i], values[i]));
      }
      return _results;
    } else {
      return [
        html.table({
          "class": "param-composite-table"
        }, html.thead({
          "class": "param-composite-thead"
        }, html.tr.apply(html, [{
          "class": "param-composite-thead-tr"
        }].concat(__slice.call((function() {
          var _j, _results1;
          _results1 = [];
          for (i = _j = 0; 0 <= n ? _j < n : _j > n; i = 0 <= n ? ++_j : --_j) {
            _results1.push(html.th({
              "class": "param-composite-th"
            }, labeledElements(labels[i])));
          }
          return _results1;
        })())))), html.tbody({
          "class": "param-composite-tbody"
        }, html.tr.apply(html, [{
          "class": "param-composite-tr"
        }].concat(__slice.call((function() {
          var _j, _results1;
          _results1 = [];
          for (i = _j = 0; 0 <= n ? _j < n : _j > n; i = 0 <= n ? ++_j : --_j) {
            _results1.push(html.td({
              "class": "param-composite-td"
            }, html.input({
              "class": "param-input",
              type: 'text',
              value: String(values[i])
            })));
          }
          return _results1;
        })())))))
      ];
    }
  };
  labeledTolerance = function(label, tolerance) {
    return [
      html.th({
        "class": "param-tolerance-th",
        scope: "row"
      }, html.label({
        "class": "param-label param-label-text"
      }, label)), html.td(html.input({
        "class": "param-input",
        type: 'text',
        value: String(tolerance.min)
      })), html.td(html.input({
        "class": "param-input",
        type: 'text',
        value: String(tolerance.max)
      }))
    ];
  };
  labeledCompositeTolerance = function(n, labels, tolerances) {
    var i, _i, _results;
    _results = [];
    for (i = _i = 0; 0 <= n ? _i < n : _i > n; i = 0 <= n ? ++_i : --_i) {
      _results.push(labeledTolerance(labels[i], {
        min: tolerances.min[i],
        max: tolerances.max[i]
      }));
    }
    return _results;
  };
  toleranceHTML = adt({
    real: function(id, meta, defaultTolerance) {
      var _ref;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {
          label: id
        };
      } else if (!(meta.label != null)) {
        meta.label = id;
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      return html.tr.apply(html, [{
        "class": "parameter param-numeric param-real",
        'data-param-id': id,
        title: escapeAttrib(meta.description)
      }].concat(__slice.call(labeledTolerance(meta.label, defaultTolerance))));
    },
    dimension1: function(id, meta, defaultTolerance) {
      var _ref;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {
          label: id
        };
      } else if (!(meta.label != null)) {
        meta.label = id;
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      return html.tr.apply(html, [{
        "class": "parameter param-numeric param-dimension1",
        'data-param-id': id,
        title: escapeAttrib(meta.description)
      }].concat(__slice.call(labeledTolerance(meta.label, defaultTolerance))));
    },
    dimension2: function(id, meta, defaultTolerance) {
      var tds, trs, _ref, _ref1;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {};
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      if ((_ref1 = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      if (!Array.isArray(defaultTolerance.min)) {
        defaultTolerance.min = [defaultTolerance.min, defaultTolerance.min, defaultTolerance.min];
      }
      if (!Array.isArray(defaultTolerance.max)) {
        defaultTolerance.max = [defaultTolerance.max, defaultTolerance.max, defaultTolerance.max];
      }
      trs = !(meta.label != null) ? [] : [
        html.tr({}, html.th({
          "class": "param-composite-label",
          scope: "rowgroup"
        }, html.span({
          "class": "param-composite-label-text"
        }, escapeAttrib(meta.label))), html.th({
          "class": "param-tolerance-legend",
          scope: "col"
        }, "Min"), html.th({
          "class": "param-tolerance-legend",
          scope: "col"
        }, "Max"))
      ];
      trs = trs.concat((function() {
        var _i, _len, _ref2, _results;
        _ref2 = labeledCompositeTolerance(2, meta.components, defaultTolerance);
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          tds = _ref2[_i];
          _results.push(html.tr.apply(html, [{
            "class": "param-numeric"
          }].concat(__slice.call(tds))));
        }
        return _results;
      })());
      return html.tbody.apply(html, [{
        "class": "parameter param-composite param-dimension2",
        'data-param-id': id,
        title: escapeAttrib(meta.description)
      }].concat(__slice.call(trs)));
    },
    dimension3: function(id, meta, defaultTolerance) {
      var tds, trs, _ref, _ref1;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {
          label: id
        };
      } else if (!(meta.label != null)) {
        meta.label = id;
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      if ((_ref1 = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      if (!Array.isArray(defaultTolerance.min)) {
        defaultTolerance.min = [defaultTolerance.min, defaultTolerance.min, defaultTolerance.min];
      }
      if (!Array.isArray(defaultTolerance.max)) {
        defaultTolerance.max = [defaultTolerance.max, defaultTolerance.max, defaultTolerance.max];
      }
      trs = !(meta.label != null) ? [] : [
        html.tr({}, html.th({
          "class": "param-composite-label",
          scope: "rowgroup"
        }, html.span({
          "class": "param-composite-label-text"
        }, escapeAttrib(meta.label))), html.th({
          "class": "param-tolerance-legend",
          scope: "col"
        }, "Min"), html.th({
          "class": "param-tolerance-legend",
          scope: "col"
        }, "Max"))
      ];
      trs = trs.concat((function() {
        var _i, _len, _ref2, _results;
        _ref2 = labeledCompositeTolerance(3, meta.components, defaultTolerance);
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          tds = _ref2[_i];
          _results.push(html.tr.apply(html, [{
            "class": "param-numeric"
          }].concat(__slice.call(tds))));
        }
        return _results;
      })());
      return html.tbody.apply(html, [{
        "class": "parameter param-composite param-dimension3",
        'data-param-id': id,
        title: escapeAttrib(meta.description)
      }].concat(__slice.call(trs)));
    },
    vector2: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    vector3: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    point2: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    point3: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    pitch1: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    pitch2: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    pitch3: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    angle: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    polar: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    cylindrical: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    spherical: function() {
      throw "Unsupported tolerance type `" + this._tag + "` (TODO)";
    },
    _: function() {
      throw "Unsupported tolerance type `" + this._tag + "`";
    }
  });
  resolveMeta = function(id, meta) {
    var _ref, _ref1;
    if (typeof meta === 'string') {
      meta = {
        label: meta
      };
    } else if (!(meta != null)) {
      meta = {
        label: id
      };
    } else {
      if ((_ref = meta.label) == null) {
        meta.label = id;
      }
    }
    if ((_ref1 = meta.description) == null) {
      meta.description = "";
    }
    return meta;
  };
  return module.exports = adt({
    parameters: function() {
      var description, params;
      description = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return html.div.apply(html, [{
        "class": "parameters"
      }].concat(__slice.call(adt.map(this, params))));
    },
    section: function() {
      var heading, params;
      heading = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return html.section.apply(html, [{
        "class": "param-section"
      }, html.h1({
        "class": "param-heading",
        title: escapeAttrib(heading)
      }, String(heading))].concat(__slice.call(adt.map(this, groupByTolerance(params)))));
    },
    real: function(id, meta, defaultValue) {
      meta = resolveMeta(id, meta);
      return wrap(id, html.div({
        "class": "param-numeric param-real",
        title: escapeAttrib(meta.description)
      }, html.label({
        "class": "param-label"
      }, html.span({
        "class": "param-label-text"
      }, String(meta.label)), html.input({
        "class": "param-input",
        type: 'text',
        value: String(defaultValue)
      }))));
    },
    dimension1: function(id, meta, defaultValue) {
      meta = resolveMeta(id, meta);
      return wrap(id, html.div({
        "class": "param-numeric param-dimension1",
        title: escapeAttrib(meta.description)
      }, html.label({
        "class": "param-label"
      }, html.span({
        "class": "param-label-text"
      }, String(meta.label)), html.input({
        "class": "param-input",
        type: 'text',
        value: String(defaultValue)
      }))));
    },
    dimension2: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-dimension2", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(2, meta.components, defaultValue, shortLabels))));
    },
    dimension3: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length, meta.components[2].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-dimension3", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(3, meta.components, defaultValue, shortLabels))));
    },
    vector2: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-vector2", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(2, meta.components, defaultValue, shortLabels))));
    },
    vector3: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length, meta.components[2].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-vector3", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(3, meta.components, defaultValue, shortLabels))));
    },
    point2: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-point2", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(2, meta.components, defaultValue, shortLabels))));
    },
    point3: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length, meta.components[2].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-point3", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(3, meta.components, defaultValue, shortLabels))));
    },
    pitch1: function(id, meta, defaultValue) {
      meta = resolveMeta(id, meta);
      return wrap(id, html.div({
        "class": "param-numeric param-pitch1",
        title: escapeAttrib(meta.description)
      }, html.label({
        "class": "param-label"
      }, html.span({
        "class": "param-label-text"
      }, String(meta.label)), html.input({
        "class": "param-input",
        type: 'text',
        value: String(defaultValue)
      }))));
    },
    pitch2: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-pitch2", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(2, meta.components, defaultValue, shortLabels))));
    },
    pitch3: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length, meta.components[2].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-pitch3", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(3, meta.components, defaultValue, shortLabels))));
    },
    angle: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    polar: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    cylindrical: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    spherical: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    integer: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    natural: function(id, meta, defaultValue) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    latice1: function(id, meta, defaultValue) {
      meta = resolveMeta(id, meta);
      return wrap(id, html.div({
        "class": "param-numeric param-latice1",
        title: escapeAttrib(meta.description)
      }, html.label({
        "class": "param-label"
      }, html.span({
        "class": "param-label-text"
      }, String(meta.label)), html.input({
        "class": "param-input",
        type: 'text',
        value: String(defaultValue)
      }))));
    },
    latice2: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-latice2", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(2, meta.components, defaultValue, shortLabels))));
    },
    latice3: function(id, meta, defaultValue) {
      var shortLabels, _ref;
      meta = resolveMeta(id, meta);
      if ((_ref = meta.components) == null) {
        meta.components = ["X", "Y", "Z"];
      }
      shortLabels = Math.max(meta.components[0].length, meta.components[1].length, meta.components[2].length) < shortLabelLength;
      if (!Array.isArray(defaultValue)) {
        defaultValue = [defaultValue, defaultValue, defaultValue];
      }
      return wrapComposite.apply(null, [id, "param-numeric param-latice3", meta.description, html.label({
        "class": "param-composite-label"
      }, html.span({
        "class": "param-composite-label-text"
      }, String(meta.label)))].concat(__slice.call(labeledInputs(3, meta.components, defaultValue, shortLabels))));
    },
    option: function(id, meta, options, defaultOption) {
      var k, keyValue, v, _ref;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {
          label: id
        };
      } else if (!(meta.label != null)) {
        meta.label = id;
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      keyValue = {};
      options = (function() {
        var _i, _len, _results;
        if (Array.isArray(options)) {
          _results = [];
          for (_i = 0, _len = options.length; _i < _len; _i++) {
            k = options[_i];
            _results.push(keyValue[k] = k);
          }
          return _results;
        } else {
          return keyValue = options;
        }
      })();
      if (defaultOption == null) {
        defaultOption = (Object.keys(keyValue))[0];
      }
      return wrap(id, html.div({
        "class": "param-numeric param-real",
        title: escapeAttrib(meta.description)
      }, labeledElements(meta.label, html.select.apply(html, [{
        "class": "param-select"
      }].concat(__slice.call((function() {
        var _results;
        _results = [];
        for (k in keyValue) {
          v = keyValue[k];
          _results.push(html.option({
            value: k,
            selected: (k === defaultOption ? true : void 0)
          }, v));
        }
        return _results;
      })()))))));
    },
    boolean: function(id, meta, defaultValue) {
      var _ref;
      if (typeof meta === 'string') {
        meta = {
          label: meta
        };
      } else if (!(meta != null)) {
        meta = {
          label: id
        };
      } else if (!(meta.label != null)) {
        meta.label = id;
      }
      if ((_ref = meta.description) == null) {
        meta.description = "";
      }
      return wrap(id, html.div({
        "class": "param-boolean",
        title: escapeAttrib(meta.description)
      }, labeledElements(meta.label, html.input({
        "class": "param-checkbox",
        type: "checkbox"
      }))));
    },
    tolerance: function() {
      var i, ii, rowgroup, rowgroups, tbodies, tolerances, _i, _len;
      tolerances = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (tolerances.length === 0) {
        return;
      }
      rowgroups = adt.map(toleranceHTML, tolerances);
      tbodies = [];
      ii = NaN;
      for (i = _i = 0, _len = rowgroups.length; _i < _len; i = ++_i) {
        rowgroup = rowgroups[i];
        if (rowgroup.tagName.toLowerCase() === "tr") {
          if (ii === i - 1) {
            tbodies[tbodies.length - 1].appendChild(rowgroup);
          } else {
            tbodies.push(html.tbody({
              "class": ""
            }, html.tr({}, html.th({
              scope: "rowgroup"
            }, ""), html.th({
              "class": "param-tolerance-legend",
              scope: "col"
            }, "Min"), html.th({
              "class": "param-tolerance-legend",
              scope: "col"
            }, "Max")), rowgroup));
          }
          ii = i;
        } else {
          tbodies.push(rowgroup);
        }
      }
      return html.div({
        "class": "parameter-set"
      }, html.table.apply(html, [{
        "class": "param-tolerance-table"
      }].concat(__slice.call(tbodies))));
    },
    range: function(id, meta, defaultValue, range) {
      throw "Unsupported parameter type `" + this._tag + "` (TODO)";
    },
    _: function() {
      throw "Unsupported parameter type `" + this._tag + "`";
    }
  });
})(typeof adt !== "undefined" && adt !== null ? adt : require('adt.js'), typeof html !== "undefined" && html !== null ? html : require('adt-html.js'));
}, "parameterize-form.js": function(exports, require, module) {// Generated by CoffeeScript 1.4.0

(function(adt) {
  var form;
  form = {
    html: require("html")
  };
  form.form = adt.constructors(form.html);
  form.get = require("./get");
  form.set = require("./set");
  form.on = function(eventKey, selector, callback) {
    var $selector;
    if (!(typeof $ !== "undefined" && $ !== null)) {
      throw "JQuery could not be found. Please ensure that $ is available before using parameterize.on.";
    }
    if (eventKey !== "update") {
      throw "Unknown event key \'" + eventKey + "\'.";
    }
    $selector = $(selector);
    $selector.on('change', 'input[type="checkbox"],select', callback);
    $selector.on('keypress', 'input[type="text"]', function(e) {
      var args;
      if (e.which === 0) {
        return;
      }
      args = arguments;
      window.setTimeout((function() {
        return callback.apply(null, args);
      }), 0);
    });
    $selector.on('keyup', 'input[type="text"]', function(e) {
      if (e.which === 0) {
        return;
      }
      switch (e.which) {
        case 8:
        case 46:
          void 0;
          break;
        case 45:
          if (!e.shiftKey) {
            return;
          }
          break;
        case 86:
        case 88:
          if (!e.ctrlKey) {
            return;
          }
          break;
        default:
          return;
      }
      callback.apply(null, arguments);
    });
  };
  form.off = function(eventKey, selector) {
    var $selector;
    if (!(typeof $ !== "undefined" && $ !== null)) {
      throw "JQuery could not be found. Please ensure that $ is available before using parameterize.off.";
    }
    if (eventKey !== "update") {
      throw "Unknown event key \'" + eventKey + "\'.";
    }
    $selector = $(selector);
    $selector.off('change', 'input[type="checkbox"],select');
    $selector.off('keypress', 'input[type="text"]');
    $selector.off('keyup', 'input[type="text"]');
  };
  return module.exports = form;
})(typeof adt !== "undefined" && adt !== null ? adt : require('adt.js'));
}, "set.js": function(exports, require, module) {// Generated by CoffeeScript 1.4.0
var parameterWriter, writeParameter, writeTolerance,
  __slice = [].slice;

writeParameter = function(els, value) {
  var el, i, _i, _len;
  if (!Array.isArray(value)) {
    if (els.length !== 1) {
      throw "Value provided " + value + " cannot populate " + els.length + " fields.";
    }
    els[0].value = value;
  } else {
    for (i = _i = 0, _len = els.length; _i < _len; i = ++_i) {
      el = els[i];
      if (!((value != null ? value[i] : void 0) != null)) {
        throw "No value at index " + i + " in [" + value + "]";
      }
      el.value = value[i];
    }
  }
};

writeTolerance = function(els, value) {
  var el, i, j, max, min, minMax, _i, _len, _ref;
  minMax = [value.min, value.max];
  min = minMax[0], max = minMax[1];
  if (!Array.isArray(min)) {
    if (els.length !== 2) {
      throw "Value provided {min: " + min + ", max: " + max + "} cannot populate " + els.length + " fields.";
    }
    els[0].value = min;
    els[1].value = max;
  } else {
    for (i = _i = 0, _len = els.length; _i < _len; i = ++_i) {
      el = els[i];
      j = Math.floor(i / 2);
      if (!(((_ref = minMax[i % 2]) != null ? _ref[j] : void 0) != null)) {
        throw "No value at index " + j + " in [" + minMax[i % 2] + "]";
      }
      el.value = minMax[i % 2][j];
    }
  }
};

parameterWriter = adt({
  Array: function(array) {
    return function(values, it) {
      var a, _i, _len;
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        a = array[_i];
        (parameterWriter(a))(values, it);
      }
    };
  },
  parameters: function() {
    var description, params;
    description = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return this(params);
  },
  section: function() {
    var heading, params;
    heading = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return this(params);
  },
  tolerance: function() {
    var tolerances;
    tolerances = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return function(values, it) {
      var t, writer, _i, _len;
      writer = function(param) {
        return function(values, it) {
          var el, value;
          el = it.nextNode();
          value = values[el.getAttribute('data-param-id')];
          return writeTolerance(el.querySelectorAll("input"), value);
        };
      };
      for (_i = 0, _len = tolerances.length; _i < _len; _i++) {
        t = tolerances[_i];
        (writer(t))(values, it);
      }
    };
  },
  boolean: function() {
    return function(values, it) {
      var el, els;
      el = it.nextNode();
      els = el.querySelectorAll("input");
      if (els.length > 1) {
        throw "Too many input elements for boolean argument.";
      }
      return els[0].checked = values[el.getAttribute('data-param-id')];
    };
  },
  _: function() {
    var tag;
    tag = this._tag;
    return function(values, it) {
      var el, value;
      el = it.nextNode();
      value = values[el.getAttribute('data-param-id')];
      writeParameter(el.querySelectorAll("input,select"), value);
    };
  }
});

module.exports = function(formElement, parameters, values) {
  var it, matches, selector, writer;
  matches = function() {
    var args, node, _ref, _ref1;
    node = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return ((_ref = (_ref1 = node.matches) != null ? _ref1 : node.mozMatchesSelector) != null ? _ref : node.webkitMatchesSelector).apply(node, args);
  };
  selector = ".parameter";
  it = document.createNodeIterator(formElement, NodeFilter.SHOW_ELEMENT, {
    acceptNode: function(node) {
      if (matches(node, selector)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_SKIP;
      }
    }
  });
  writer = parameterWriter(parameters);
  writer(values, it);
};
}});

// Assign this library to a global variable if a global variable is defined
var parameterizeExports = this.require("parameterize-form");
var k;
for (k in parameterizeExports)
  parameterize[k] = parameterizeExports[k];
// Restore the original require method
if (typeof originalRequire === 'undefined')
  delete this.require;
else
  this.require = originalRequire;
})();



/*
 * JSandbox JavaScript Library v0.2.3
 * 2009-01-25
 * By Elijah Grey, http://eligrey.com
 * Licensed under the X11/MIT License
 *   See LICENSE.md
 */

/*global self */

/*jslint undef: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true,
newcap: true, immed: true, maxerr: 1000, strict: true */

/*! @source http://purl.eligrey.com/github/jsandbox/blob/master/src/jsandbox.js*/

var JSandbox = (function (self) {
  "use strict";
  var undef_type = "undefined",
  doc            = self.document,
  Worker         = self.Worker;
  
  if (typeof Worker === undef_type) {
    return;
  }
  
  // modified json2.js that works in strict mode and stays private
  var JSON = self.JSON || {};
  (function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==="string"){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());
  
  var
  jsonParse         = JSON.parse,
  jsonStringify     = JSON.stringify,
  
  // repeatedly used properties/strings (for minification)
  $eval       = "eval",
  $exec       = "exec",
  $load       = "load",
  $requests   = "requests",
  $input      = "input",
  $terminate  = "terminate",
  $data       = "data",
  $callback   = "callback",
  $onerror    = "onerror",
  $worker     = "worker",
  $onresponse = "onresponse",
  $prototype  = "prototype",
  $call       = "call",
  
  str_type   = "string",
  fun_type   = "function",
  
  
  Sandbox = function () {
    var sandbox = this;
    
    if (!(sandbox instanceof Sandbox)) {
      return new Sandbox();
    }
    
    sandbox[$worker] = new Worker(Sandbox.url);
    sandbox[$requests] = {};
    
    sandbox[$worker].onmessage = function (event) {
      var data = event[$data], request;
      if (typeof data === str_type) { // parse JSON
        try {
          data = jsonParse(data);
        } catch (e) {
          return;
        }
      }
      if (typeof data !== "object") {
        return;
      }
      request = sandbox[$requests][data.id];
      if (request) {
        if (data.error) {
          if (typeof sandbox[$onerror] === fun_type) {
            sandbox[$onerror](data, request);
          }
          if (typeof request[$onerror] === fun_type) {
            request[$onerror][$call](sandbox, data.error);
          }
        } else {
          if (typeof sandbox[$onresponse] === fun_type) {
            sandbox[$onresponse](data, request);
          }
        
          if (typeof request[$callback] === fun_type) {
            request[$callback][$call](sandbox, data.results);
          }
        }
        delete sandbox[$requests][data.id];
      }
    };
  },
  proto = Sandbox[$prototype],
  
  createRequestMethod = function (method) {
    proto[method] = function (options, callback, input, onerror) {
      if (typeof options === str_type ||
          Object[$prototype].toString[$call](options) === "[object Array]" ||
          arguments.length > 1)
      { // called in (data, callback, input, onerror) style
        options = {
          data     : options,
          input    : input,
          callback : callback,
          onerror  : onerror
        };
      }
      
      if (method === $load && typeof options[$data] === str_type) {
        options[$data] = [options[$data]];
      }
      
      var data  = options[$data],
        id    = this.createRequestID();
      
      input = options[$input];
      
      delete options[$data];
      delete options[$input];
      
      this[$requests][id] = options;
      
      var msg = {
        id       : id,
        method   : method,
        data     : data,
        input    : input
      };
      try {
        // Attempt to use structured clone in browsers that support it
        this[$worker].postMessage(msg);
      } catch (e) {
        this[$worker].postMessage(jsonStringify(msg));
      }
    
      return id;
    };
    Sandbox[method] = function () {
      var sandbox = new Sandbox();
    
      sandbox[$onresponse] = sandbox[$onerror] = function () {
        sandbox[$terminate]();
        sandbox = null;
      };
    
      Sandbox[$prototype][method].apply(
        sandbox,
        Array[$prototype].slice[$call](arguments)
      );
      return Sandbox;
    };
  },
  methods = [$eval, $load, $exec],
  i = 3; // methods.length
  
  while (i--) {
    createRequestMethod(methods[i]);
  }
  
  proto[$terminate] = function () {
    this[$requests] = {};
    this[$worker].onmessage = null;
    this[$worker][$terminate]();
  };
  
  proto.abort = function (id) {
    delete this[$requests][id];
  };
  
  proto.createRequestID = function () {
    var id = Math.random().toString();
    if (id in this[$requests]) {
      return this.createRequestID();
    }
    return id;
  };

  Sandbox.create = function (workerUrl) {
    if (workerUrl != null)
      Sandbox.url = workerUrl;
  };
  
  if (typeof doc !== undef_type) {
    var linkElems = doc.getElementsByTagName("link");
    i = linkElems.length;
    while (i--) {
      if (linkElems[i].getAttribute("rel") === "jsandbox")
      {
        Sandbox.url = linkElems[i].getAttribute("href");
        break;
      }
    }
  }
  
  return Sandbox;
}(self)),
Sandbox = JSandbox;


/*
 * Copyright 2011-2013, CircuitHub.com
 */
var morpheus = morpheus || {}; /* Redeclaring morpheus is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

morpheus.generator = 
// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";

  var asm, compileASM, compileASMBounds, compileGLSL, exports, flatten, gl, glsl, glslCompiler, glslCompilerDistance, glslLibrary, glslSceneDistance, glslSceneId, mapASM, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, optimizeASM, safeExport, safeTry, shallowClone, toStringPrototype, translateCSM,
    __slice = [].slice;

  flatten = function(array) {
    var a, _ref;
    return (_ref = []).concat.apply(_ref, (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        a = array[_i];
        _results.push(Array.isArray(a) ? flatten(a) : [a]);
      }
      return _results;
    })());
  };

  shallowClone = function(array) {
    return array.slice(0);
  };

  math_sqrt2 = Math.sqrt(2.0);

  math_invsqrt2 = 1.0 / math_sqrt2;

  math_degToRad = Math.PI / 180.0;

  math_radToDeg = 180.0 / Math.PI;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

  morpheus.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logDebug = ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  morpheus.logException = function(locationName, error) {
    var logArgs;
    logArgs = ["Uncaught exception in `" + locationName + "`:\n"];
    logArgs.push((error.message != null ? "" + error.message + "\n" : error));
    if (error.stack != null) {
      logArgs.push(error.stack);
    }
    morpheus.logInternalError.apply(morpheus, logArgs);
  };

  safeExport = function(name, errorValue, callback) {
    return safeTry(name, callback, function(error) {
      morpheus.logException(name, error);
      return errorValue;
    });
  };

  safeTry = function(name, callback, errorCallback) {
    if ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug) {
      return callback;
    } else {
      return function() {
        try {
          return callback.apply(null, arguments);
        } catch (error) {
          return errorCallback(error);
        }
      };
    }
  };

  gl = glQueryMath;

  toStringPrototype = (function() {

    function toStringPrototype(str) {
      this.str = str;
    }

    toStringPrototype.prototype.toString = function() {
      return this.str;
    };

    return toStringPrototype;

  })();

  translateCSM = safeExport('morpheus.generator.translateCSM', '', function(apiSourceCode, csmSourceCode) {
    var jsSourceCode, variablesSource;
    variablesSource = csmSourceCode.match(/var[^;]*;/g);
    csmSourceCode = (csmSourceCode.replace(/var[^;]*;/g, '')).trim();
    jsSourceCode = "\"use strict\";\n(function(){\n  /* BEGIN API */\n  \n  var exportedParameters = {};\n\n" + apiSourceCode + "\n\n  try {\n\n  /* BEGIN PARAMETERS */\n\n" + (variablesSource ? variablesSource.join('\n') : "") + "\n\n  /* BEGIN SOURCE */ //HERE\n  return scene({ params: exportedParameters }" + (csmSourceCode.trim().length > 0 ? ',' : '') + "\n\n" + csmSourceCode + "\n\n  );//*/\n  } catch(err) {\n    return String(err);\n  }\n})();";
    return jsSourceCode;
  });

  asm = {
    union: function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'union',
        nodes: flatten(nodes)
      };
    },
    intersect: function() {
      var flattenedNodes, n, nodes, result, _i, _len;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      flattenedNodes = flatten(nodes);
      result = {
        type: 'intersect',
        nodes: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = flattenedNodes.length; _i < _len; _i++) {
            n = flattenedNodes[_i];
            if (n.type !== 'intersect') {
              _results.push(n);
            }
          }
          return _results;
        })()
      };
      for (_i = 0, _len = flattenedNodes.length; _i < _len; _i++) {
        n = flattenedNodes[_i];
        if (n.type === 'intersect') {
          result.nodes = result.nodes.concat(n.nodes);
        }
      }
      return result;
    },
    invert: function() {
      var nodes;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return {
        type: 'invert',
        nodes: flatten(nodes)
      };
    },
    mirror: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'mirror',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    repeat: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'repeat',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    translate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'translate',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    rotate: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'rotate',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    scale: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'scale',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    material: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'material',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    halfspace: function(attr) {
      return {
        type: 'halfspace',
        attr: attr
      };
    },
    corner: function(attr) {
      return {
        type: 'corner',
        attr: attr
      };
    },
    cylinder: function(attr) {
      return {
        type: 'cylinder',
        attr: attr
      };
    },
    sphere: function(attr) {
      return {
        type: 'sphere',
        attr: attr
      };
    },
    chamfer: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'chamfer',
        attr: attr,
        nodes: flatten(nodes)
      };
    },
    bevel: function() {
      var attr, nodes;
      attr = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return {
        type: 'bevel',
        attr: attr,
        nodes: flatten(nodes)
      };
    }
  };

  mapASM = function(preDispatch, postDispatch, stack, node, flags) {
    var n, resultNode, _i, _len, _ref;
    stack.reverse();
    resultNode = {
      type: node.type,
      attr: node.attr,
      nodes: []
    };
    if (preDispatch[node.type] != null) {
      preDispatch[node.type](stack, resultNode, flags);
    } else {
      preDispatch['default'](stack, resultNode, flags);
    }
    stack.reverse();
    stack.push(resultNode);
    _ref = node.nodes || [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      mapASM(preDispatch, postDispatch, stack, n, flags);
    }
    stack.pop();
    stack.reverse();
    if (postDispatch[node.type] != null) {
      postDispatch[node.type](stack, resultNode, flags);
    } else {
      postDispatch['default'](stack, resultNode, flags);
    }
    stack.reverse();
    return stack[0];
  };

  optimizeASM = function(node, flags) {
    var postDispatch, preDispatch, resultNode;
    resultNode = {};
    if (!(flags != null)) {
      flags = {
        invert: false
      };
    }
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      "default": function(stack, node, flags) {}
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
        return stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        var s, _i, _len;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'union':
              stack[0].nodes = stack[0].nodes.concat(node.nodes);
              return;
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        var s, _i, _len;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'intersect':
              stack[0].nodes = stack[0].nodes.concat(node.nodes);
              return;
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        var n, s, _i, _j, _len, _len1, _ref;
        if (node.nodes.length > 0) {
          morpheus.logInternalError("ASM Optimize: Unexpected child nodes found in halfspace node.");
        }
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'intersect':
              _ref = s.nodes;
              for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                n = _ref[_j];
                if (n.type === 'halfspace' && n.attr.axis === node.attr.axis) {
                  if ((n.attr.val > node.attr.val && flags.invert) || (n.attr.val < node.attr.val && !flags.invert)) {
                    n.attr = node.attr;
                  }
                  return;
                }
              }
          }
          break;
        }
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        return stack[0].nodes.push(node);
      }
    };
    return mapASM(preDispatch, postDispatch, [
      {
        type: 'union',
        nodes: []
      }
    ], node, flags);
  };

  compileASMBounds = function(abstractSolidModel) {
    var COMPOSITION_INTERSECT, COMPOSITION_UNION, collectChildren, flags, intersectChildren, postDispatch, preDispatch, result, unionChildren;
    if (!(abstractSolidModel != null)) {
      return null;
    }
    COMPOSITION_UNION = 0;
    COMPOSITION_INTERSECT = 1;
    preDispatch = {
      invert: function(stack, node, flags) {
        return flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        return flags.composition.push(COMPOSITION_UNION);
      },
      intersect: function(stack, node, flags) {
        return flags.composition.push(COMPOSITION_INTERSECT);
      },
      "default": function(stack, node, flags) {}
    };
    unionChildren = function(nodes) {
      var bounds, i, n, _i, _j, _k, _len;
      bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        for (i = _j = 0; _j <= 2; i = ++_j) {
          bounds[0][i] = Math.min(n.bounds[0][i], bounds[0][i]);
        }
        for (i = _k = 0; _k <= 2; i = ++_k) {
          bounds[1][i] = Math.max(n.bounds[1][i], bounds[1][i]);
        }
      }
      return bounds;
    };
    intersectChildren = function(nodes) {
      var bounds, i, n, _i, _j, _k, _len;
      bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        for (i = _j = 0; _j <= 2; i = ++_j) {
          bounds[0][i] = Math.max(n.bounds[0][i], bounds[0][i]);
        }
        for (i = _k = 0; _k <= 2; i = ++_k) {
          bounds[1][i] = Math.min(n.bounds[1][i], bounds[1][i]);
        }
      }
      return bounds;
    };
    collectChildren = function(nodes, flags) {
      var composition;
      composition = flags.composition[flags.composition.length - 1];
      if (composition === COMPOSITION_UNION) {
        return unionChildren(nodes);
      } else {
        return intersectChildren(nodes);
      }
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.invert = !flags.invert;
        return stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.composition.pop();
        return stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        flags.composition.pop();
        return stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        var i, _i, _j;
        node.bounds = collectChildren(node.nodes, flags);
        for (i = _i = 0; _i <= 2; i = ++_i) {
          if (typeof node.attr.offset[i] === 'number') {
            node.bounds[0][i] += node.attr.offset[i];
          }
        }
        for (i = _j = 0; _j <= 2; i = ++_j) {
          if (typeof node.attr.offset[i] === 'number') {
            node.bounds[1][i] += node.attr.offset[i];
          }
        }
        return stack[0].nodes.push(node);
      },
      rotate: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      },
      scale: function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        if (typeof node.attr.val === 'string') {

        } else {
          node.bounds[flags.invert ? 1 : 0][node.attr.axis] = node.attr.val;
        }
        return stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        if (typeof node.attr.radius === 'number') {
          node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
          node.bounds[0][node.attr.axis] = -Infinity;
          node.bounds[1][node.attr.axis] = Infinity;
        } else {
          node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        }
        return stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        if (typeof node.attr.radius === 'number') {
          node.bounds = [[-node.attr.radius, -node.attr.radius, -node.attr.radius], [node.attr.radius, node.attr.radius, node.attr.radius]];
        } else {
          node.bounds = [[-Infinity, -Infinity, -Infinity], [Infinity, Infinity, Infinity]];
        }
        return stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        node.bounds = collectChildren(node.nodes, flags);
        return stack[0].nodes.push(node);
      }
    };
    flags = {
      invert: false,
      composition: [COMPOSITION_UNION]
    };
    result = mapASM(preDispatch, postDispatch, [
      {
        nodes: []
      }
    ], abstractSolidModel, flags);
    result.flags = flags;
    return result;
  };

  compileASM = safeExport('morpheus.generator.compileASM', null, function(concreteSolidModel) {
    var compileASMNode, dispatch;
    if (typeof concreteSolidModel === 'string') {
      throw concreteSolidModel;
    }
    if (!(concreteSolidModel != null)) {
      return null;
    }
    dispatch = {
      scene: function(node) {
        var n;
        if (node.nodes.length > 1) {
          return asm.union.apply(asm, (function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })());
        } else if (node.nodes.length === 1) {
          return compileASMNode(node.nodes[0]);
        } else {
          return {};
        }
      },
      box: function(node) {
        /*
              if Array.isArray node.attr.dimensions
                halfspaces = for i in [0..2]
                  asm.halfspace 
                    val: glsl.mul (glsl.index node.attr.dimensions, i), 0.5
                    axis: i
                asm.mirror { axes: [0,1,2] }, asm.intersect halfspaces[0], halfspaces[1], halfspaces[2]
        */
        return asm.mirror({
          axes: [0, 1, 2]
        }, asm.corner({
          val: glsl.mul(node.attr.dimensions, 0.5)
        }));
      },
      sphere: function(node) {
        return asm.sphere({
          radius: node.attr.radius
        });
      },
      cylinder: function(node) {
        var halfspaces;
        if (node.attr.length != null) {
          halfspaces = [
            asm.halfspace({
              val: node.attr.length * 0.5,
              axis: node.attr.axis
            }), asm.invert(asm.halfspace({
              val: node.attr.length * -0.5,
              axis: node.attr.axis
            }))
          ];
          return asm.intersect(asm.cylinder({
            radius: node.attr.radius,
            axis: node.attr.axis
          }), halfspaces[0], halfspaces[1]);
        } else {
          return asm.cylinder({
            radius: node.attr.radius,
            axis: node.attr.axis
          });
        }
      },
      intersect: function(node) {
        var n;
        return asm.intersect.apply(asm, (function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })());
      },
      union: function(node) {
        var n;
        return asm.union.apply(asm, (function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })());
      },
      difference: function(node) {
        var n;
        if (node.nodes.length > 0) {
          return asm.intersect(compileASMNode(node.nodes[0]), asm.invert.apply(asm, (function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes.slice(1, node.nodes.length);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()));
        } else {
          return node;
        }
      },
      mirror: function(node) {
        var n;
        return asm.mirror.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      repeat: function(node) {
        var n;
        return asm.repeat.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      translate: function(node) {
        var n;
        return asm.translate.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      rotate: function(node) {
        var n;
        return asm.rotate.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      scale: function(node) {
        var n;
        return asm.scale.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      material: function(node) {
        var n;
        return asm.material.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      chamfer: function(node) {
        var n;
        return asm.chamfer.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      bevel: function(node) {
        var n;
        return asm.bevel.apply(asm, [node.attr].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      wedge: function(node) {
        var halfSpaceAxis, n;
        halfSpaceAxis = node.attr.axis + 1 > 2 ? 0 : node.attr.axis + 1;
        return asm.intersect.apply(asm, [asm.rotate({
          axis: node.attr.axis,
          angle: node.attr.from
        }, asm.halfspace({
          val: 0.0,
          axis: halfSpaceAxis
        })), asm.rotate({
          axis: node.attr.axis,
          angle: node.attr.to
        }, asm.invert(asm.halfspace({
          val: 0.0,
          axis: halfSpaceAxis
        })))].concat(__slice.call((function() {
          var _i, _len, _ref, _results;
          _ref = node.nodes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            _results.push(compileASMNode(n));
          }
          return _results;
        })())));
      },
      bend: function(node) {
        var direction, n, offset, offsetVec, radiusVec, upAxis;
        offset = node.attr.offset != null ? node.attr.offset : 0;
        (offsetVec = [0.0, 0.0, 0.0])[node.attr.offsetAxis] = offset;
        direction = node.attr.direction;
        if (direction == null) {
          direction = 1;
        }
        if (direction !== 1) {
          direction = -1;
        }
        if (!(node.attr.radius != null) || node.attr.radius === 0) {
          return asm.union(asm.intersect.apply(asm, __slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()).concat([direction === 1 ? asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))) : asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(-0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))))])), asm.intersect(asm.translate({
            offset: offsetVec
          }, asm.rotate.apply(asm, [{
            axis: node.attr.axis,
            angle: glsl.mul(direction, node.attr.angle)
          }].concat(__slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })())))), (direction === 1 ? asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          })))) : asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: glsl.mul(-0.5, node.attr.angle)
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))))));
        } else {
          upAxis = (function() {
            switch (node.attr.offsetAxis) {
              case 0:
                if (node.attr.axis === 2) {
                  return 1;
                } else {
                  return 2;
                }
              case 1:
                if (node.attr.axis === 2) {
                  return 0;
                } else {
                  return 2;
                }
              case 2:
                if (node.attr.axis === 1) {
                  return 0;
                } else {
                  return 1;
                }
            }
          })();
          (radiusVec = [0.0, 0.0, 0.0])[upAxis] = -node.attr.radius;
          return asm.union(asm.intersect.apply(asm, __slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()).concat([direction === 1 ? asm.halfspace({
            val: offset,
            axis: node.attr.offsetAxis
          }) : asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.axis
          }))))])), asm.intersect(asm.translate({
            offset: glsl.sub(offsetVec, radiusVec)
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.translate.apply(asm, [{
            offset: radiusVec
          }].concat(__slice.call((function() {
            var _i, _len, _ref, _results;
            _ref = node.nodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              n = _ref[_i];
              _results.push(compileASMNode(n));
            }
            return _results;
          })()))))), asm.invert(asm.translate({
            offset: offsetVec
          }, asm.rotate({
            axis: node.attr.axis,
            angle: node.attr.angle
          }, asm.halfspace({
            val: 0.0,
            axis: node.attr.offsetAxis
          }))))));
        }
      }
    };
    compileASMNode = function(node) {
      switch (typeof node) {
        case 'object':
          if (dispatch[node.type] != null) {
            return dispatch[node.type](node);
          } else {
            morpheus.logInternalError("Unexpected node type '" + node.type + "'.");
            return {};
          }
          break;
        default:
          morpheus.logInternalError("Unexpected node of type '" + (typeof node) + "'.");
          return {};
      }
    };
    if (concreteSolidModel.type !== 'scene') {
      morpheus.logInternalError("Expected node of type 'scene' at the root of the solid model, instead, got '" + concreteSolidModel.type + "'.");
      return null;
    }
    return optimizeASM(compileASMNode(concreteSolidModel));
  });

  glsl = (function() {
    var api, isArrayType;
    isArrayType = function(a, typeString) {
      var element, _i, _len;
      for (_i = 0, _len = a.length; _i < _len; _i++) {
        element = a[_i];
        if (typeof element !== typeString) {
          return false;
        }
      }
      return true;
    };
    return api = {
      index: function(a, index) {
        if (Array.isArray(a)) {
          return a[index];
        } else {
          return "" + a + "[" + index + "]";
        }
      },
      floor: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(Math.floor(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return Math.floor(a);
        } else {
          return "floor(" + (glsl.literal(a)) + ")";
        }
      },
      fract: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(ai - Math.floor(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return a - Math.floor(a);
        } else {
          return "fract(" + (glsl.literal(a)) + ")";
        }
      },
      abs: function(a) {
        var ai, _i, _len, _results;
        if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(Math.abs(ai));
          }
          return _results;
        } else if (typeof a === 'number') {
          return Math.abs(a);
        } else {
          return "abs(" + (glsl.literal(a)) + ")";
        }
      },
      cos: function(a) {
        if (typeof a === 'number') {
          return Math.cos(a);
        } else {
          return "cos(" + a + ")";
        }
      },
      sin: function(a) {
        if (typeof a === 'number') {
          return Math.sin(a);
        } else {
          return "sin(" + a + ")";
        }
      },
      dot: function(a, b) {
        var i, result, _i, _ref;
        if (typeof a === 'string' || typeof b === 'string') {
          return "dot(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform dot product operation with array operands of different lengths.";
          }
          if (a.length < 2 || a.length > 4) {
            throw "Cannot perform dot product operation on vectors of " + a.length + " dimensions.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            result = 0.0;
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              result += a[i] * b[i];
            }
            return result;
          } else {
            return "dot(" + (glsl.vecLit(a)) + ", " + (glsl.vecLit(b)) + ")";
          }
        } else {
          throw "Cannot perform dot product operation on operands with types '" + (typeof a) + "' and '" + (typeof b) + "'.";
        }
      },
      cross: function(a, b) {
        if (typeof a === 'string' || typeof b === 'string') {
          return "cross(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform cross product operation with array operands of different lengths.";
          }
          if (a.length !== 3) {
            throw "Cannot perform cross product operation on vectors of " + a.length + " dimensions.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          } else {
            return "cross(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Cannot perform cross operation on operands with types '" + (typeof a) + "' and '" + (typeof b) + "'.";
        }
      },
      length: function(a) {
        if (isArrayType(a, 'number')) {
          return Math.sqrt(glsl.dot(a, a));
        } else {
          return "length(" + (glsl.vecLit(axis)) + ")";
        }
      },
      mul: function(a, b) {
        var i, _i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a * b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            case 1:
              return b;
            case -1:
              return "-" + (glsl.literal(b));
            default:
              return "" + (glsl.floatLit(a)) + " * " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return 0;
            case 1:
              return a;
            case -1:
              return "-" + (glsl.literal(a));
            default:
              return "" + (glsl.literal(a)) + " * " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform multiply operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(a[i] * b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " * " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " * " + (glsl.literal(b));
        }
      },
      mod: function(a, b) {
        var i, _i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a % b;
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform modulo operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(a[i] % b[i]);
            }
            return _results;
          } else {
            return "mod(" + (glsl.vecLit(a)) + "," + (glsl.vecLit(b)) + ")";
          }
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            default:
              return "mod(" + (glsl.floatLit(a)) + "," + (glsl.literal(b)) + ")";
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return NaN;
            default:
              return "mod(" + (glsl.literal(a)) + "," + (glsl.floatLit(b)) + ")";
          }
        } else {
          return "mod(" + (glsl.literal(a)) + "," + (glsl.literal(b)) + ")";
        }
      },
      div: function(a, b) {
        var i, _i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a / b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return 0;
            default:
              return "" + (glsl.floatLit(a)) + " / " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return "" + (glsl.literal(a)) + " / 0.0";
            default:
              return "" + (glsl.literal(a)) + " / " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform divide operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(a[i] / b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " / " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " / " + (glsl.literal(b));
        }
      },
      add: function(a, b) {
        var i, _i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a + b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return b;
            default:
              return "" + (glsl.floatLit(a)) + " + " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          return glsl.add(b, a);
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform add operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(a[i] + b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " + " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " + " + (glsl.literal(b));
        }
      },
      sub: function(a, b) {
        var i, _i, _ref, _results;
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        } else if (typeof a === 'number') {
          switch (a) {
            case 0:
              return glsl.neg(b);
            default:
              return "" + (glsl.floatLit(a)) + " - " + (glsl.literal(b));
          }
        } else if (typeof b === 'number') {
          switch (b) {
            case 0:
              return a;
            default:
              return "" + (glsl.literal(a)) + " - " + (glsl.floatLit(b));
          }
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform subtract operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(a[i] - b[i]);
            }
            return _results;
          } else {
            return "" + (glsl.vecLit(a)) + " - " + (glsl.vecLit(b));
          }
        } else {
          return "" + (glsl.literal(a)) + " - " + (glsl.literal(b));
        }
      },
      neg: function(a) {
        var ai, _i, _len, _results;
        if (typeof a === 'number') {
          return -a;
        } else if ((Array.isArray(a)) && (isArrayType(a, 'number'))) {
          _results = [];
          for (_i = 0, _len = a.length; _i < _len; _i++) {
            ai = a[_i];
            _results.push(-ai);
          }
          return _results;
        } else {
          return "-" + (glsl.literal(a));
        }
      },
      min: function(a, b) {
        var i, _i, _ref, _ref1, _ref2, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.min(a, b);
        } else if ((typeof a === (_ref1 = typeof b) && _ref1 === 'string')) {
          return "min(" + a + ", " + b + ")";
        } else if (typeof a === 'string') {
          return "min(" + a + ", " + (glsl.literal(b)) + ")";
        } else if (typeof b === 'string') {
          return "min(" + (glsl.literal(a)) + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform min operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref2 = a.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
              _results.push(Math.min(a[i], b[i]));
            }
            return _results;
          } else {
            return "min(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Operands passed to the min operation have incorrect types.";
        }
      },
      max: function(a, b) {
        var i, _i, _ref, _ref1, _ref2, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.max(a, b);
        } else if ((typeof a === (_ref1 = typeof b) && _ref1 === 'string')) {
          return "max(" + a + ", " + b + ")";
        } else if (typeof a === 'string') {
          return "max(" + a + ", " + (glsl.literal(b)) + ")";
        } else if (typeof b === 'string') {
          return "max(" + (glsl.literal(a)) + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref2 = a.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(b)) + ")";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      clamp: function(a, min, max) {
        var i, _i, _ref, _ref1, _ref2, _ref3, _ref4, _results;
        if (((typeof a === (_ref1 = typeof min) && _ref1 === (_ref = typeof max)) && _ref === 'number')) {
          return Math.clamp(a, min, max);
        } else if (((typeof a === (_ref3 = typeof min) && _ref3 === (_ref2 = typeof max)) && _ref2 === 'string')) {
          return "clamp(" + a + ", " + min + ", " + max + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(min)) && (Array.isArray(max))) {
          if (a.length !== b.length) {
            throw "Cannot perform clamp operation with array operands of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(min, 'number')) && (isArrayType(max, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref4 = a.length; 0 <= _ref4 ? _i < _ref4 : _i > _ref4; i = 0 <= _ref4 ? ++_i : --_i) {
              _results.push(Math.clamp(a[i], min[i], max[i]));
            }
            return _results;
          } else {
            return "clamp(" + (glsl.vec3Lit(a)) + ", " + (glsl.vec3Lit(min)) + ", " + (glsl.vec3Lit(max)) + ")";
          }
        } else {
          return "clamp(" + (typeof a === 'string' ? a : glsl.literal(a)) + ", " + (typeof min === 'string' ? min : glsl.literal(min)) + ", " + (typeof max === 'string' ? max : glsl.literal(max)) + ")";
        }
      },
      mini: function(a, b) {
        var i, _i, _ref, _ref1, _ref2, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.min(a, b);
        } else if ((typeof a === (_ref1 = typeof b) && _ref1 === 'string')) {
          return "min(" + a + ", " + b + ")";
        } else if (typeof a === 'string' || typeof b === 'string') {
          return "max(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref2 = a.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(vec3(" + a + "), vec3(" + b + "))";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      maxi: function(a, b) {
        var i, _i, _ref, _ref1, _ref2, _results;
        if ((typeof a === (_ref = typeof b) && _ref === 'number')) {
          return Math.max(a, b);
        } else if ((typeof a === (_ref1 = typeof b) && _ref1 === 'string')) {
          return "max(" + a + ", " + b + ")";
        } else if (typeof a === 'string' || typeof b === 'string') {
          return "max(" + a + ", " + b + ")";
        } else if ((Array.isArray(a)) && (Array.isArray(b))) {
          if (a.length !== b.length) {
            throw "Cannot perform operation with arrays of different lengths.";
          }
          if ((isArrayType(a, 'number')) && (isArrayType(b, 'number'))) {
            _results = [];
            for (i = _i = 0, _ref2 = a.length; 0 <= _ref2 ? _i < _ref2 : _i > _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
              _results.push(Math.max(a[i], b[i]));
            }
            return _results;
          } else {
            return "max(vec3(" + a + "), vec3(" + b + "))";
          }
        } else {
          throw "Operands passed to the max operation have incorrect types.";
        }
      },
      literal: function(a) {
        if (typeof a === 'number') {
          return glsl.floatLit(a);
        } else if (Array.isArray(a)) {
          return glsl.vecLit(a);
        } else {
          return "(" + a + ")";
        }
      },
      floatLit: function(a) {
        if (typeof a === 'number' && (a | 0) === a) {
          return a + '.0';
        } else {
          return "(" + a + ")";
        }
      },
      vecLit: function(a) {
        if (a.length > 1 && a.length < 5) {
          return glsl["vec" + a.length + "Lit"](a);
        } else {
          throw "Cannot create vector literal with length " + a.length + ".";
        }
      },
      vec2Lit: function(a) {
        if (typeof a === 'number') {
          return "vec2(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec2(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      vec3Lit: function(a) {
        if (typeof a === 'number') {
          return "vec3(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec3(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + "," + (glsl.floatLit(a[2])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      vec4Lit: function(a) {
        if (typeof a === 'number') {
          return "vec4(" + (glsl.floatLit(a)) + ")";
        } else if (Array.isArray(a)) {
          return "vec4(" + (glsl.floatLit(a[0])) + "," + (glsl.floatLit(a[1])) + "," + (glsl.floatLit(a[2])) + "," + (glsl.floatLit(a[3])) + ")";
        } else {
          return "(" + a + ")";
        }
      },
      axisRotation: function(axis, angle) {
        if ((isArrayType(axis, 'number')) && (typeof angle === 'number')) {
          return gl.matrix3.newAxisRotation(axis, angle);
        }
        return morpheus.logInternalError("axisRotation is not yet implemented in the GLSL API.");
        /*
              # TODO: This can (should) probably be optimized a lot...
              # Convert rotation to quaternion representation
              length = glsl.length axis
              halfAngle = glsl.mul angle, 0.5
              sinHalfOverLength = glsl.div (glsl.sin halfAngle), length
              xyz = glsl.mul axis, sinHalfOverLength
              x = glsl.index xyz, 0
              y = glsl.index xyz, 1
              z = glsl.index xyz, 2
              w = glsl.cos halfAngle
              # Convert quaternion to matrix representation       
              xx = glsl.mul x, x
              xy = glsl.mul x, y
              xz = glsl.mul x, z
              xw = glsl.mul x, w
              yy = glsl.mul y, y
              yz = glsl.mul y, z
              yw = glsl.mul y, w
              zz = glsl.mul z, z
              zw = glsl.mul z, w
              return [
                (glsl.sub 1, (glsl.mul 2, (glsl.add yy, zz))), (glsl.mul 2, (glsl.add xy, zw)),               (glsl.mul 2, (glsl.sub xz, yw)),
                (glsl.mul 2, (glsl.sub xy, zw)),               (glsl.sub 1, (glsl.mul 2, (glsl.add xx, zz))), (glsl.mul 2, (glsl.add yz, xw)),
                (glsl.mul 2, (glsl.add xz, yw)),               (glsl.mul 2, (glsl.sub yz, xw)),               (glsl.sub 1, (glsl.mul 2, (glsl.mul xx, yy)))
              ]
        */

      }
    };
  })();

  glslLibrary = {
    distanceFunctions: {
      boxChamferDist: {
        id: '_boxChamferDist',
        returnType: 'float',
        "arguments": ['vec3', 'vec3', 'vec3', 'float'],
        code: (function() {
          var center, chamferCenter, chamferDist, chamferDistLength, chamferRadius, dist, gtChamferCenter, position, radius, rel;
          position = 'a';
          center = 'b';
          radius = 'c';
          chamferRadius = 'd';
          rel = 'r';
          dist = 's';
          chamferCenter = 'cc';
          chamferDist = 'ccd';
          chamferDistLength = 'ccdl';
          gtChamferCenter = 'gtcc';
          return ["vec3 " + rel + " = abs(" + position + " - " + center + ");", "vec3 " + dist + " = max(vec3(0.0), " + rel + " - " + center + ");", "if (any(greaterThan(" + rel + ", " + center + " + vec3(" + chamferRadius + ")))) { return max(max(" + dist + ".x, " + dist + ".y), " + dist + ".z); }", "vec3 " + chamferCenter + " = " + radius + " - vec3(" + chamferRadius + ");", "bvec3 " + gtChamferCenter + " = greaterThan(" + rel + ", " + chamferCenter + ");", "if (!any(" + gtChamferCenter + ")) { return 0.0; }", "vec3 " + chamferDist + " = " + rel + " - " + chamferCenter + ";", "if (min(" + chamferDist + ".x, " + chamferDist + ".y) < 0.0 && min(" + chamferDist + ".x, " + chamferDist + ".z) < 0.0 && min(" + chamferDist + ".y, " + chamferDist + ".z) < 0.0)", "{ return max(max(" + dist + ".x, " + dist + ".y), " + dist + ".z); }", "float " + chamferDistLength + ";", "if (all(" + gtChamferCenter + ")) {", "  " + chamferDistLength + " = length(" + chamferDist + ");", "}", "else if(" + chamferDist + ".x < 0.0) {", "  " + chamferDistLength + " = length(" + chamferDist + ".yz);", "}", "else if (" + chamferDist + ".y < 0.0) {", "  " + chamferDistLength + " = length(" + chamferDist + ".xz);", "}", "else { // " + chamferDist + ".z < 0.0", "  " + chamferDistLength + " = length(" + chamferDist + ".xy);", "}", "return min(" + chamferDistLength + " - " + chamferRadius + ", 0.0);"];
        })()
      }
    },
    compile: function(libraryFunctions) {
      var argCharCode, argName, c, charCodeA, code, distanceFunction, f, i, v, _i, _j, _len, _ref, _ref1;
      code = "";
      for (f in libraryFunctions) {
        v = libraryFunctions[f];
        distanceFunction = this.distanceFunctions[f + 'Dist'];
        if (!distanceFunction) {
          morpheus.log("GLSL distance function '" + f + "Dist' could not be found.");
          continue;
        }
        code += '\n';
        code += "" + distanceFunction.returnType + " " + distanceFunction.id + "(";
        charCodeA = 'a'.charCodeAt(0);
        for (i = _i = 0, _ref = distanceFunction["arguments"].length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          argCharCode = charCodeA + i;
          argName = String.fromCharCode(argCharCode);
          code += "in " + distanceFunction["arguments"][i] + " " + argName;
          if (i < distanceFunction["arguments"].length - 1) {
            code += ',';
          }
        }
        code += ") {\n";
        _ref1 = distanceFunction.code;
        for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
          c = _ref1[_j];
          code += c + '\n';
        }
        code += "}\n";
      }
      return code;
    }
  };

  glslCompiler = function(abstractSolidModel, preDispatch, postDispatch) {
    var flags, rayOrigin, result;
    if (!(abstractSolidModel != null)) {
      return;
    }
    rayOrigin = 'ro';
    flags = {
      invert: false,
      glslFunctions: {},
      glslPrelude: [['ro', "" + rayOrigin]],
      materials: [],
      materialIdStack: [-1],
      composition: [glslCompiler.COMPOSITION_UNION]
    };
    flags.glslPrelude.code = "";
    flags.glslPrelude.counter = 0;
    result = mapASM(preDispatch, postDispatch, [
      {
        nodes: []
      }
    ], abstractSolidModel, flags);
    result.flags = flags;
    return result;
  };

  glslCompiler.COMPOSITION_UNION = 0;

  glslCompiler.COMPOSITION_INTERSECT = 1;

  glslCompiler.preludePush = function(prelude, value, valueType) {
    var name;
    name = 'r' + prelude.counter;
    prelude.counter += 1;
    prelude.code += "  " + (valueType != null ? valueType : 'vec3') + " " + name + " = " + value + ";\n";
    prelude.push([name, value]);
    return name;
  };

  glslCompiler.preludePop = function(prelude) {
    return prelude.pop()[0];
  };

  glslCompiler.preludeTop = function(prelude) {
    if (!Array.isArray(prelude || prelude.length === 0)) {
      throw "Could not retrieve top value from prelude.";
    }
    return prelude[prelude.length - 1][0];
  };

  glslCompiler.preludeAdd = function(prelude, value, valueType) {
    var name;
    name = 'r' + prelude.counter;
    prelude.counter += 1;
    prelude.code += "  " + (valueType != null ? valueType : 'vec3') + " " + name + " = " + value + ";\n";
    return name;
  };

  glslCompilerDistance = function(primitiveCallback, minCallback, maxCallback, modifyCallback) {
    var compileCompositeNode, postDispatch, preDispatch, rayOrigin;
    rayOrigin = 'ro';
    preDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
      },
      union: function(stack, node, flags) {
        var i;
        flags.composition.push(glslCompiler.COMPOSITION_UNION);
        node.halfSpaces = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i <= 5; i = ++_i) {
            _results.push(null);
          }
          return _results;
        })();
      },
      intersect: function(stack, node, flags) {
        var i;
        flags.composition.push(glslCompiler.COMPOSITION_INTERSECT);
        node.halfSpaces = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i <= 5; i = ++_i) {
            _results.push(null);
          }
          return _results;
        })();
      },
      chamfer: function(stack, node, flags) {},
      bevel: function(stack, node, flags) {},
      translate: function(stack, node, flags) {
        var ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        glslCompiler.preludePush(flags.glslPrelude, "" + ro + " - vec3(" + node.attr.offset + ")");
      },
      rotate: function(stack, node, flags) {
        var components, cosAngle, mat, ro, sinAngle;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (Array.isArray(node.attr.axis)) {
          mat = glsl.axisRotation(node.attr.axis, glsl.mul(glsl.neg(math_degToRad), node.attr.angle));
          glslCompiler.preludePush(flags.glslPrelude, "mat3(" + mat + ") * " + ro);
        } else {
          cosAngle = glsl.cos(glsl.mul(-math_degToRad, node.attr.angle));
          sinAngle = glsl.sin(glsl.mul(-math_degToRad, node.attr.angle));
          components = [
            (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + ro + ".x";
                case 1:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.x'), glsl.mul(sinAngle, ro + '.z')));
                default:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.x'), glsl.mul(glsl.neg(sinAngle), ro + '.y')));
              }
            })(), (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + (glsl.add(glsl.mul(cosAngle, ro + '.y'), glsl.mul(glsl.neg(sinAngle), ro + '.z')));
                case 1:
                  return "" + ro + ".y";
                default:
                  return "" + (glsl.add(glsl.mul(sinAngle, ro + '.x'), glsl.mul(cosAngle, ro + '.y')));
              }
            })(), (function() {
              switch (node.attr.axis) {
                case 0:
                  return "" + (glsl.add(glsl.mul(sinAngle, ro + '.y'), glsl.mul(cosAngle, ro + '.z')));
                case 1:
                  return "" + (glsl.add(glsl.mul(glsl.neg(sinAngle), ro + '.x'), glsl.mul(cosAngle, ro + '.z')));
                default:
                  return "" + ro + ".z";
              }
            })()
          ];
          glslCompiler.preludePush(flags.glslPrelude, "vec3(" + components + ")");
        }
      },
      scale: function(stack, node, flags) {
        var i, ro;
        node.halfSpaces = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i <= 5; i = ++_i) {
            _results.push(null);
          }
          return _results;
        })();
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (Array.isArray(node.attr.factor)) {
          morpheus.logInternalError("GLSL Compiler: Scale along multiple axes are not yet supported.");
        } else {
          glslCompiler.preludePush(flags.glslPrelude, glsl.div(ro, node.attr.factor));
        }
      },
      mirror: function(stack, node, flags) {
        var a, axes, axesCodes, i, ro, _i, _len, _ref;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        axes = [false, false, false];
        _ref = node.attr.axes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          a = _ref[_i];
          axes[a] = true;
        }
        if (axes[0] && axes[1] && axes[2]) {
          glslCompiler.preludePush(flags.glslPrelude, "abs(" + ro + ")");
        } else {
          axesCodes = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; _j <= 2; i = ++_j) {
              _results.push(axes[i] ? "abs(" + ro + "[" + i + "])" : "" + ro + "[" + i + "]");
            }
            return _results;
          })();
          glslCompiler.preludePush(flags.glslPrelude, "vec3(" + axesCodes + ")");
        }
      },
      repeat: function(stack, node, flags) {
        var cell, cellClamp, cellClampInterval, cellFloor, cellMax, cellMin, halfCells, halfInterval, halfParity, interval, parity, preludeVar, ro, roSubParity;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (!(node.attr.count != null)) {
          interval = glslCompiler.preludeAdd(flags.glslPrelude, glsl.vec3Lit(node.attr.interval), 'vec3');
          halfInterval = glslCompiler.preludeAdd(flags.glslPrelude, glsl.mul(0.5, interval), 'vec3');
          glslCompiler.preludePush(flags.glslPrelude, "mod(abs(" + ro + " + " + halfInterval + "), " + interval + ")}");
        } else {
          preludeVar = function(a, type) {
            return glslCompiler.preludeAdd(flags.glslPrelude, a, type);
          };
          interval = preludeVar(glsl.vec3Lit(node.attr.interval), 'vec3');
          halfInterval = preludeVar(glsl.mul(0.5, interval), 'vec3');
          parity = preludeVar(glsl.mod(node.attr.count, "vec3(2.0)"));
          halfParity = preludeVar(glsl.mul(0.5, parity));
          roSubParity = glsl.sub(ro, glsl.mul(halfParity, interval));
          cell = preludeVar(glsl.div(roSubParity, interval));
          cellFloor = preludeVar(glsl.floor(cell));
          halfCells = glsl.mul(node.attr.count, 0.5);
          cellMin = preludeVar(glsl.sub(glsl.neg(halfCells), halfParity));
          cellMax = preludeVar(glsl.sub(glsl.sub(halfCells, halfParity), "vec3(1.0)"));
          cellClamp = glsl.clamp(cellFloor, cellMin, cellMax);
          cellClampInterval = glsl.mul(cellClamp, interval);
          glslCompiler.preludePush(flags.glslPrelude, glsl.sub(glsl.sub(roSubParity, cellClampInterval), halfInterval));
        }
      },
      material: function(stack, node, flags) {
        flags.materialIdStack.push(flags.materials.length);
        flags.materials.push("vec3(" + node.attr.color + ")");
      },
      "default": function(stack, node, flags) {}
    };
    /*
    
      # TODO: This is overly complex and broken... need a better optimization method for corners....
      # (Perhaps one that lets the GLSL compiler precompute operations between uniforms (e.g. glsl.min(param0, param1)
    
      compileCorner = (ro, flags, state, chamferRadius, bevelRadius) ->
        remainingHalfSpaces = 0
        remainingHalfSpaces += 1 for h in state.hs when h != null
    
        #if remainingHalfSpaces == 1
        #  # Find the axis (from 0 to 5) for the halfSpace node
        #  for index in [0..5] when state.hs[index] != null
        #    state.codes.push primitiveCallback (if index > 2 then "#{ro}[#{index - 3}] - #{state.hs[index]}" else "-#{ro}[#{index}] + #{state.hs[index]}"), flags
        #    state.hs[index] = null
        #    break
        #  remainingHalfSpaces -= 1
        #else if remainingHalfSpaces > 1
        if remainingHalfSpaces > 0
          cornerSpaces = 0
          cornerSpaces += 1 if state.hs[0] != null or state.hs[3] != null
          cornerSpaces += 1 if state.hs[1] != null or state.hs[4] != null
          cornerSpaces += 1 if state.hs[2] != null or state.hs[5] != null
          chamferRadius = 0 if cornerSpaces == 1 or bevelRadius != 0
          cornerSize = [
            if state.hs[0] != null then (glsl.sub state.hs[0], radius) else if state.hs[3] != null then (glsl.sub radius, state.hs[3]) else 0, #TODO: zero for cornersize might be the wrong choice... (possibly something large instead?)
            if state.hs[1] != null then (glsl.sub state.hs[1], radius) else if state.hs[4] != null then (glsl.sub radius, state.hs[4]) else 0,
            if state.hs[2] != null then (glsl.sub state.hs[2], radius) else if state.hs[5] != null then (glsl.sub radius, state.hs[5]) else 0]
          signs = [
            state.hs[0] == null and state.hs[3] != null,
            state.hs[1] == null and state.hs[4] != null,
            state.hs[2] == null and state.hs[5] != null]
          roComponents  = [
            if signs[0] then "-#{ro}.x" else "#{ro}.x", 
            if signs[1] then "-#{ro}.y" else "#{ro}.y", 
            if signs[2] then "-#{ro}.z" else "#{ro}.z"]
          roWithSigns = 
            if not (signs[0] or signs[1] or signs[2])
              "#{ro}"
            else if (signs[0] or state.hs[3] == null) and (signs[1] or state.hs[4] == null) and (signs[2] or state.hs[5] == null)
              "-#{ro}"
            else
              glslCompiler.preludeAdd flags.glslPrelude, "vec3(#{roComponents[0]}, #{roComponents[1]}, #{roComponents[2]})"
          cornerWithSigns = glsl.vec3Lit cornerSize
          dist = glslCompiler.preludeAdd flags.glslPrelude, "#{roWithSigns} - #{glsl.vec3Lit cornerSize}"
    
          # Special cases
          if cornerSpaces > 1
            if radius > 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0)) - #{radius}", flags
            else if bevelRadius > 0
              axisCombinations = []
              axisCombinations.push 0 if state.hs[0] != null or state.hs[3] != null
              axisCombinations.push 1 if state.hs[1] != null or state.hs[4] != null
              axisCombinations.push 2 if state.hs[2] != null or state.hs[5] != null
              # TODO: assert(axisCombinations.length >= 2)
              glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[1]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[1]] - bevelRadius}", "float"
              if axisCombinations.length == 3
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[0]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[0]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
                glslCompiler.preludePush flags.glslPrelude, "#{roComponents[axisCombinations[1]]} + #{roComponents[axisCombinations[2]]} - #{cornerSize[axisCombinations[1]] + cornerSize[axisCombinations[2]] - bevelRadius}", "float"
              switch axisCombinations.length
                when 2
                  state.codes.push primitiveCallback "max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
                when 3
                  state.codes.push primitiveCallback "max(max(max(length(max(#{dist}, 0.0)), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude}), #{math_invsqrt2} * #{glslCompiler.preludePop flags.glslPrelude})", flags
            else # bevelRadius == chamferRadius == 0
              state.codes.push primitiveCallback "length(max(#{dist}, 0.0))", flags
            if state.hs[0] != null or state.hs[3] != null
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            if state.hs[1] != null or state.hs[4] != null
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            if state.hs[2] != null or state.hs[5] != null
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= cornerSpaces
          else
            # General cases
            if state.hs[0] != null or state.hs[3] != null
              state.codes.push primitiveCallback "#{dist}.x", flags
              if state.hs[0] != null then state.hs[0] = null else state.hs[3] = null
            else if state.hs[1] != null or state.hs[4] != null
              state.codes.push primitiveCallback "#{dist}.y", flags
              if state.hs[1] != null then state.hs[1] = null else state.hs[4] = null
            else if state.hs[2] != null or state.hs[5] != null
              state.codes.push primitiveCallback "#{dist}.z", flags
              if state.hs[2] != null then state.hs[2] = null else state.hs[5] = null
            remainingHalfSpaces -= 1
        return
    */

    compileCompositeNode = function(name, cmpCallback, stack, node, flags) {
      var bevelRadius, c, chamferRadius, codes, collectCode, cornersState, h, ro, s, _i, _j, _k, _len, _len1, _len2, _ref;
      if (node.nodes.length === 0) {
        return;
      }
      codes = [];
      collectCode = function(codes, nodes) {
        var n, _i, _len;
        for (_i = 0, _len = nodes.length; _i < _len; _i++) {
          n = nodes[_i];
          if (n.code != null) {
            codes.push(n.code);
          }
          switch (n.type) {
            case 'translate':
            case 'rotate':
            case 'mirror':
            case 'repeat':
            case 'invert':
            case 'material':
            case 'chamfer':
            case 'bevel':
              collectCode(codes, n.nodes);
          }
        }
      };
      collectCode(codes, node.nodes);
      ro = glslCompiler.preludeTop(flags.glslPrelude);
      cornersState = {
        codes: [],
        hs: shallowClone(node.halfSpaces)
      };
      chamferRadius = 0;
      bevelRadius = 0;
      for (_i = 0, _len = stack.length; _i < _len; _i++) {
        s = stack[_i];
        switch (s.type) {
          case 'chamfer':
            chamferRadius = s.attr.radius;
            break;
          case 'bevel':
            bevelRadius = s.attr.radius;
            break;
          case 'translate':
          case 'rotate':
          case 'scale':
          case 'invert':
          case 'mirror':
          case 'repeat':
            continue;
        }
        break;
      }
      /* Compile the first and a possible second corner
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      compileCorner ro, flags, cornersState, chamferRadius, bevelRadius
      codes = codes.concat cornersState.codes
      #
      */

      _ref = cornersState.hs;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        h = _ref[_j];
        if (!(h !== null)) {
          continue;
        }
        morpheus.logInternalError("GLSL Compiler: Post-condition failed, some half spaces were not processed during corner compilation.");
        break;
      }
      node.code = codes.shift();
      for (_k = 0, _len2 = codes.length; _k < _len2; _k++) {
        c = codes[_k];
        node.code = cmpCallback(c, node.code, flags);
      }
    };
    postDispatch = {
      invert: function(stack, node, flags) {
        flags.invert = !flags.invert;
        stack[0].nodes.push(node);
      },
      union: function(stack, node, flags) {
        flags.composition.pop();
        compileCompositeNode('Union', (!flags.invert ? minCallback : maxCallback), stack, node, flags);
        stack[0].nodes.push(node);
      },
      intersect: function(stack, node, flags) {
        flags.composition.pop();
        compileCompositeNode('Intersect', (!flags.invert ? maxCallback : minCallback), stack, node, flags);
        stack[0].nodes.push(node);
      },
      chamfer: function(stack, node, flags) {
        stack[0].nodes.push(node);
      },
      bevel: function(stack, node, flags) {
        stack[0].nodes.push(node);
      },
      translate: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        if (node.nodes.length === 0) {
          morpheus.logInternalError("GLSL Compiler: Translate node is empty.");
          return;
        }
        stack[0].nodes.push(node);
      },
      rotate: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        if (node.nodes.length === 0) {
          morpheus.logInternalError("GLSL Compiler: Rotate node is empty.");
          return;
        }
        stack[0].nodes.push(node);
      },
      scale: function(stack, node, flags) {
        if (flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_UNION) {
          compileCompositeNode('Scale', minCallback, stack, node, flags);
        } else if (flags.composition[flags.composition.length - 1] === glslCompiler.COMPOSITION_INTERSECT) {
          compileCompositeNode('Scale', maxCallback, stack, node, flags);
        }
        if (!Array.isArray(node.attr.factor)) {
          node.code = modifyCallback(node.code, glsl.mul("(" + node.code + ")", node.attr.factor));
        }
        glslCompiler.preludePop(flags.glslPrelude);
        stack[0].nodes.push(node);
      },
      mirror: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        stack[0].nodes.push(node);
      },
      repeat: function(stack, node, flags) {
        glslCompiler.preludePop(flags.glslPrelude);
        stack[0].nodes.push(node);
      },
      halfspace: function(stack, node, flags) {
        var ro;
        if (node.nodes.length !== 0) {
          morpheus.logInternalError("GLSL Compiler: Halfspace node is not empty.");
          return;
        }
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (flags.invert) {
          node.code = primitiveCallback(glsl.sub(node.attr.val, "" + ro + "[" + node.attr.axis + "]"), flags);
        } else {
          node.code = primitiveCallback(glsl.sub("" + ro + "[" + node.attr.axis + "]", node.attr.val), flags);
        }
        /* Generate half-space primitive when it cannot be compiled into a corner
        #if typeof node.attr.val == 'string'
        #  ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
        #  if flags.invert
        #    node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
        #  else
        #    node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
        #else
        # Bin half-spaces for corner compilation
        translateOffset = 0.0
        for s in stack
          if s.halfSpaces?
            # Assign to the halfspace bins for corner compilation
            index = node.attr.axis + (if flags.invert then 3 else 0)
            val = glsl.add node.attr.val, translateOffset
            s.halfSpaces[index] =
              if s.halfSpaces[index] == null
                 val
              else if flags.composition[flags.composition.length - 1] == glslCompiler.COMPOSITION_UNION
                if index < 3
                  glsl.max s.halfSpaces[index], val
                else
                  glsl.min s.halfSpaces[index], val
              else
                if index < 3
                  glsl.min s.halfSpaces[index], val
                else
                  glsl.max s.halfSpaces[index], val
          else
            switch s.type
              when 'translate'
                translateOffset = glsl.add translateOffset, s.attr.offset[node.attr.axis]
                continue # Search for preceding intersect/union node 
              when 'invert', 'mirror'
                continue # Search for preceding intersect/union node
              else
                # This may occur in special cases where we cannot do normal corner compilation
                # (Such as a separate transformation on the plane itself - with a wedge node for example)
                ro = glslCompiler.preludeTop flags.glslPrelude # Current ray origin
                if flags.invert
                  node.code = primitiveCallback (glsl.sub node.attr.val, "#{ro}[#{node.attr.axis}]"), flags
                else
                  node.code = primitiveCallback (glsl.sub "#{ro}[#{node.attr.axis}]", node.attr.val), flags
          break
        #
        */

        stack[0].nodes.push(node);
      },
      corner: function(stack, node, flags) {
        var bevelRadius, chamferRadius, cornerDist, cornerVal, diagonalDist, dist, ro, roSigned, s, _i, _len;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        dist = glslCompiler.preludeAdd(flags.glslPrelude, glsl.sub(ro, node.attr.val));
        chamferRadius = 0;
        bevelRadius = 0;
        for (_i = 0, _len = stack.length; _i < _len; _i++) {
          s = stack[_i];
          switch (s.type) {
            case 'chamfer':
              chamferRadius = s.attr.radius;
              break;
            case 'bevel':
              bevelRadius = s.attr.radius;
              break;
            case 'translate':
            case 'rotate':
            case 'scale':
            case 'invert':
            case 'mirror':
            case 'repeat':
              continue;
          }
          break;
        }
        if (bevelRadius !== 0) {
          roSigned = glslCompiler.preludeAdd(flags.glslPrelude, flags.invert ? "-" + ro : "" + ro);
          cornerVal = typeof node.attr.val === 'string' ? glslCompiler.preludeAdd(flags.glslPrelude, node.attr.val) : node.attr.val;
          diagonalDist = ["(" + roSigned + "[0] + " + roSigned + "[1] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 1))) + "))", "(" + roSigned + "[0] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 0), glsl.index(cornerVal, 2))) + "))", "(" + roSigned + "[1] + " + roSigned + "[2] - (" + (glsl.add(glsl.index(cornerVal, 1), glsl.index(cornerVal, 2))) + "))"];
          if (flags.invert) {
            cornerDist = "length(min(" + dist + ", 0.0))";
            node.code = primitiveCallback("min(min(min(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " - " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " - " + bevelRadius + ")", flags);
          } else {
            cornerDist = "length(max(" + dist + ", 0.0))";
            node.code = primitiveCallback("max(max(max(" + cornerDist + ", " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 0)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 1)) + " + " + bevelRadius + "), " + math_invsqrt2 + " * " + (glsl.index(diagonalDist, 2)) + " + " + bevelRadius + ")", flags);
          }
        } else if (chamferRadius !== 0) {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          } else {
            node.code = primitiveCallback("length(max(" + (glsl.add(dist, chamferRadius)) + ", 0.0)) - " + chamferRadius, flags);
          }
        } else {
          if (flags.invert) {
            node.code = primitiveCallback("length(min(" + dist + ", 0.0))", flags);
          } else {
            node.code = primitiveCallback("length(max(" + dist + ", 0.0))", flags);
          }
        }
        stack[0].nodes.push(node);
      },
      cylinder: function(stack, node, flags) {
        var planeCoords, ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        planeCoords = ['yz', 'xz', 'xy'][node.attr.axis];
        if (!flags.invert) {
          node.code = primitiveCallback(glsl.sub("length(" + ro + "." + planeCoords + ")", node.attr.radius), flags);
        } else {
          node.code = primitiveCallback(glsl.sub(node.attr.radius, "length(" + ro + "." + planeCoords + ")"), flags);
        }
        stack[0].nodes.push(node);
      },
      sphere: function(stack, node, flags) {
        var ro;
        ro = glslCompiler.preludeTop(flags.glslPrelude);
        if (!flags.invert) {
          node.code = primitiveCallback(glsl.sub("length(" + ro + ")", node.attr.radius), flags);
        } else {
          node.code = primitiveCallback(glsl.sub(node.attr.radius, "length(" + ro + ")"), flags);
        }
        stack[0].nodes.push(node);
      },
      material: function(stack, node, flags) {
        flags.materialIdStack.pop();
        stack[0].nodes.push(node);
      },
      "default": function(stack, node, flags) {
        stack[0].nodes.push(node);
      }
    };
    return (function(abstractSolidModel) {
      return glslCompiler(abstractSolidModel, preDispatch, postDispatch);
    });
  };

  glslSceneDistance = glslCompilerDistance((function(a) {
    return a;
  }), (function(a, b) {
    return "min(" + a + ", " + b + ")";
  }), (function(a, b) {
    return "max(" + a + ", " + b + ")";
  }), (function(oldVal, newVal) {
    return newVal;
  }));

  glslSceneId = glslCompilerDistance((function(a, flags) {
    var result;
    result = new toStringPrototype(a);
    result.materialId = flags.materialIdStack[flags.materialIdStack.length - 1];
    return result;
  }), (function(a, b, flags) {
    var id, memoA, memoB, result;
    memoA = glslCompiler.preludeAdd(flags.glslPrelude, String(a), 'float');
    memoB = glslCompiler.preludeAdd(flags.glslPrelude, String(b), 'float');
    id = glslCompiler.preludeAdd(flags.glslPrelude, "" + memoA + " < " + memoB + "? " + a.materialId + " : " + b.materialId, 'int');
    result = new toStringPrototype("" + memoA + " < " + memoB + "? " + memoA + " : " + memoB);
    result.materialId = id;
    return result;
  }), (function(a, b, flags) {
    var id, memoA, memoB, result;
    memoA = glslCompiler.preludeAdd(flags.glslPrelude, String(a), 'float');
    memoB = glslCompiler.preludeAdd(flags.glslPrelude, String(b), 'float');
    id = glslCompiler.preludeAdd(flags.glslPrelude, "" + memoA + " > " + memoB + "? " + a.materialId + " : " + b.materialId, 'int');
    result = new toStringPrototype("" + memoA + " > " + memoB + "? " + memoA + " : " + memoB);
    result.materialId = id;
    return result;
  }), (function(oldVal, newVal) {
    var result;
    result = new toStringPrototype(newVal);
    result.materialId = oldVal.materialId;
    return result;
  }));

  compileGLSL = safeExport('morpheus.editor.compileGLSL', ['', ''], function(abstractSolidModel, params) {
    var fragmentShader, rayDirection, rayOrigin, shaders, usePerspectiveProjection, vertexShader;
    rayOrigin = 'ro';
    rayDirection = 'rd';
    usePerspectiveProjection = false;
    /* TEMPORARY
    morpheus.logDebug "ASM:"
    morpheus.logDebug abstractSolidModel
    #
    */

    vertexShader = function() {
      var bounds, boundsResult, sceneTranslation;
      boundsResult = compileASMBounds(abstractSolidModel);
      if (!(boundsResult != null)) {
        return '';
      }
      if (boundsResult.nodes.length !== 1) {
        morpheus.logInternalError('GLSL Compiler: Expected exactly one result node from the bounding box compiler.');
        return '';
      }
      bounds = boundsResult.nodes[0].bounds;
      /* TEMPORARY
      morpheus.logDebug "Bounds Result:"
      morpheus.logDebug boundsResult
      #
      */

      sceneTranslation = [isFinite(bounds[0][0]) && isFinite(bounds[1][0]) ? bounds[0][0] + bounds[1][0] : '0.0', isFinite(bounds[0][1]) && isFinite(bounds[1][1]) ? bounds[0][1] + bounds[1][1] : '0.0', isFinite(bounds[0][2]) && isFinite(bounds[1][2]) ? bounds[0][2] + bounds[1][2] : '0.0'];
      return "const float Infinity = (1.0/0.0);\nconst vec3 sceneScale = vec3(" + (bounds[1][0] - bounds[0][0]) + ", " + (bounds[1][1] - bounds[0][1]) + ", " + (bounds[1][2] - bounds[0][2]) + ");\nconst vec3 sceneTranslation = vec3(" + sceneTranslation + ");\nuniform mat4 projection;\nuniform mat4 view;\nuniform mat3 model;\nattribute vec3 position;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\nvoid main(void) {\n  modelPosition = position;\n  " + (usePerspectiveProjection ? "viewPosition = (view * vec4(position, 1.0)).xyz;" : "") + "\n  gl_Position = projection * view * vec4(model * position, 1.0);\n}\n";
    };
    fragmentShader = function() {
      var distanceCode, distancePreludeCode, distanceResult, generateUniforms, idCode, idPreludeCode, idResult, sceneMaterial;
      distanceResult = glslSceneDistance(abstractSolidModel);
      if (!(distanceResult != null)) {
        return '';
      }
      if (distanceResult.nodes.length !== 1) {
        morpheus.logInternalError('GLSL Compiler: Expected exactly one result node from the distance compiler.');
      }
      /* TEMPORARY
      console.log "Distance Result:"
      console.log distanceResult
      #
      */

      idResult = glslSceneId(abstractSolidModel);
      if (idResult.nodes.length !== 1) {
        morpheus.logInternalError('GLSL Compiler: Expected exactly one result node from the material id compiler.');
      }
      /* TEMPORARY
      console.log "Id Result:"
      console.log idResult
      #
      */

      sceneMaterial = function(materials) {
        var binarySearch, i, m, result, _i, _ref;
        result = "\nvec3 sceneMaterial(in vec3 ro) {\n  int id = sceneId(ro);\n";
        /* Render the raw scene id as a grayscale value
        if materials.length > 0
          result += "  return vec3(float(id) * #{glsl.floatLit (1.0 / (materials.length - 1))});\n"
        else
          result += "  return vec3(0.5);\n"
        
        #
        */

        binarySearch = function(start, end) {
          var diff, mid;
          diff = end - start;
          if (diff === 1) {
            return "m" + start;
          } else {
            mid = start + Math.floor(diff * 0.5);
            return "(id < " + mid + "? " + (binarySearch(start, mid)) + " : " + (binarySearch(mid, end)) + ")";
          }
        };
        if (materials.length > 0) {
          for (i = _i = 0, _ref = materials.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            m = materials[i];
            result += "  vec3 m" + i + " = " + m + ";\n";
          }
          result += "  return id >= 0? " + (binarySearch(0, materials.length)) + " : vec3(0.5);\n";
        } else {
          result += "  return vec3(0.5);\n";
        }
        result += "}\n\n";
        return result;
      };
      generateUniforms = function(params) {
        var attr, generateUniform, name;
        generateUniform = function(attr) {
          var defaultValue, id, meta, type;
          id = attr[0], meta = attr[1], defaultValue = attr[2];
          type = (function() {
            switch (attr._tag) {
              case 'real':
              case 'dimension1':
              case 'pitch1':
              case 'angle':
                return 'float';
              case 'dimension2':
              case 'vector2':
              case 'point2':
              case 'pitch2':
              case 'polar':
              case 'cylindrical':
                return 'vec2';
              case 'dimension3':
              case 'vector3':
              case 'point3':
              case 'pitch3':
              case 'spherical':
                return 'vec3';
              case 'natural':
              case 'latice1':
                return 'float';
              case 'latice2':
                return 'vec2';
              case 'latice3':
                return 'vec3';
              default:
                return "(ERROR " + attr._tag + ")";
            }
          })();
          return ("uniform " + type + " " + name + ";") + (meta.description != null ? " // " + meta.description : "");
        };
        return ((function() {
          var _results;
          _results = [];
          for (name in params) {
            attr = params[name];
            switch (attr._tag) {
              case 'tolerance':
              case 'range':
                _results.push(generateUniform(attr[0]));
                break;
              default:
                _results.push(generateUniform(attr));
            }
          }
          return _results;
        })()).join('\n');
      };
      distanceCode = distanceResult.nodes[0].code;
      distancePreludeCode = distanceResult.flags.glslPrelude.code;
      idCode = idResult.nodes[0].code;
      idPreludeCode = idResult.flags.glslPrelude.code;
      return "#ifdef GL_ES\n  precision highp float;\n#endif\nconst float Infinity = (1.0/0.0);\nuniform mat4 view;\nuniform mat3 model;\nvarying vec3 modelPosition;\n" + (usePerspectiveProjection ? "varying vec3 viewPosition;" : "") + "\n\n" + (generateUniforms(params)) + "\n\n" + (glslLibrary.compile(distanceResult.flags.glslFunctions)) + "\n\nfloat sceneDist(in vec3 " + rayOrigin + ") {\n  " + (distancePreludeCode != null ? distancePreludeCode : '') + "\n  return max(0.0," + (distanceCode != null ? distanceCode : 'Infinity') + ");\n}\n\nvec3 sceneNormal(in vec3 p) {\n  const float eps = 0.00001;\n  vec3 n;\n  n.x = sceneDist( vec3(p.x+eps, p.yz) ) - sceneDist( vec3(p.x-eps, p.yz) );\n  n.y = sceneDist( vec3(p.x, p.y+eps, p.z) ) - sceneDist( vec3(p.x, p.y-eps, p.z) );\n  n.z = sceneDist( vec3(p.xy, p.z+eps) ) - sceneDist( vec3(p.xy, p.z-eps) );\n  return normalize(n);\n}\n\nint sceneId(in vec3 " + rayOrigin + ") {\n  " + (idPreludeCode != null ? idPreludeCode : '') + "\n  " + (idCode != null ? idCode + ';' : '') + "\n  return " + (idCode != null ? idCode.materialId : '-1') + ";\n}\n\n" + (sceneMaterial(idResult.flags.materials)) + "\n\nvoid main(void) {\n  // Constants\n  const int steps = 84;\n  const float threshold = 0.005;\n  \n  vec3 rayOrigin = modelPosition;\n  vec3 rayDir = vec3(0.0,0.0,-1.0) * mat3(view) * model;\n  vec3 prevRayOrigin = rayOrigin;\n  bool hit = false;\n  float dist = Infinity;\n  //float prevDist = (1.0/0.0);\n  //float bias = 0.0; // corrective bias for the step size\n  //float minDist = (1.0/0.0);\n  for(int i = 0; i < steps; i++) {\n    //dist = sceneRayDist(rayOrigin, rayDir);\n    //prevDist = dist;\n    dist = sceneDist(rayOrigin);\n    //minDist = min(minDist, dist);\n    if (dist <= 0.0) {\n      hit = true;\n      break;\n    }\n    prevRayOrigin = rayOrigin;\n    //rayOrigin += (max(dist, threshold) + bias) * rayDir;\n    rayOrigin += max(dist, threshold) * rayDir;\n    if (all(notEqual(clamp(rayOrigin, vec3(-1.0), vec3(1.0)), rayOrigin))) { break; }\n  }\n  vec3 absRayOrigin = abs(rayOrigin);\n  //if(!hit && max(max(absRayOrigin.x, absRayOrigin.y), absRayOrigin.z) >= 1.0) { discard; }\n  //if(!hit && prevDist >= dist) { discard; }\n  if(!hit && rayOrigin.z <= -1.0) { \n    // Get the z-plane intersection\n    const float floorOffset = 1.0; // For the bottom of the bounding box this should be 0.0\n    const float boundaryOffset = -0.5; // For a larger boundary > 0.0, or for a smaller boundary < 0.0\n    const float shadeFactor = 0.45; // Shading factor (1.0 for full shader)\n    float dz = (modelPosition.z + 1.0) / -rayDir.z;\n    vec3 pz = modelPosition + rayDir * dz;\n    pz.z += floorOffset;\n    float shade = max(0.0, 1.0 + boundaryOffset - max(0.0,sceneDist(pz)));\n    gl_FragColor = vec4(0.0,0.0,0.0,max(0.0, shadeFactor*shade*shade*shade));\n  }\n  else if (!hit) {\n    discard;\n  }\n  else {\n    //if (!hit) { discard; }\n    //if(!hit) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }\n    //const vec3 diffuseColor = vec3(0.1, 0.2, 0.8);\n    vec3 diffuseColor = sceneMaterial(prevRayOrigin);\n    //const vec3 specularColor = vec3(1.0, 1.0, 1.0);\n          \n    // Lighting parameters\n    const float specularFactor = 0.3;\n    const float specularPhongShininess = 10.0;\n    const vec3 lightPos = vec3(1.5,2.5, 4.0);\n    vec3 lightDir = normalize(lightPos - prevRayOrigin);\n    vec3 normal = sceneNormal(prevRayOrigin);\n\n    //* Diffuse shading\n    float diffuse = dot(normal, lightDir);\n    //*/\n    //* Phong reflection model\n    vec3 reflectDir = reflect(-rayDir, normal);\n    vec3 specular = vec3(specularFactor * pow(max(dot(reflectDir, rayDir), 0.0), specularPhongShininess));\n    //*/\n\n    //* Regular shading\n    const float ambientFactor = 0.7;\n    const float diffuseFactor = 1.0 - ambientFactor;\n    diffuse = ambientFactor + diffuse * diffuseFactor;\n    //*/\n\n    /* Cel shading\n    const float cellA = 0.3;\n    const float cellB = 0.4;\n    const float cellC = 0.5;\n    const float cellD = 1.0 - cellA;\n    diffuse = cellA + max(step(cellA, diffuse)*cellA, max(step(cellB, diffuse)*cellB, max(step(cellC, diffuse)*cellC, step(cellD, diffuse)*cellD)));\n    //*/\n\n    //* Ambient occlusion\n    const float aoIterations = 5.0;\n    const float aoFactor = 2.0;\n    const float aoDistanceFactor = 1.6;\n    const float aoDistanceDelta = 0.1 / 5.0;\n    float ao = 1.0;\n    float invPow2 = 1.0;\n    vec3 aoDirDist = normal * aoDistanceDelta;\n    vec3 aoPos = prevRayOrigin;\n    for (float i = 1.0; i < (aoIterations + 1.0);  i += 1.0) {\n      invPow2 *= aoDistanceFactor * 0.5;\n      aoPos += aoDirDist;\n      ao -= aoFactor * invPow2 * (i * aoDistanceDelta - sceneDist(aoPos));\n    }\n    diffuse *= max(ao, 0.0);\n    //*/\n    \n    gl_FragColor = vec4(diffuseColor * diffuse + specular, 1.0);\n  }\n}\n";
    };
    shaders = [vertexShader(), fragmentShader()];
    return shaders;
  });

  exports = exports != null ? exports : {};

  exports.translateCSM = translateCSM;

  exports.compileASM = compileASM;

  exports.compileGLSL = compileGLSL;

  return exports;

}).call(this);


/*
 * Copyright 2011-2013, CircuitHub.com
 */
var morpheus = morpheus || {}; /* Redeclaring morpheus is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

morpheus.editor = 
// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";

  var create, exports, getSourceCode, safeExport, safeTry, translateSugaredJS;

  morpheus.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logDebug = ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  morpheus.logException = function(locationName, error) {
    var logArgs;
    logArgs = ["Uncaught exception in `" + locationName + "`:\n"];
    logArgs.push((error.message != null ? "" + error.message + "\n" : error));
    if (error.stack != null) {
      logArgs.push(error.stack);
    }
    morpheus.logInternalError.apply(morpheus, logArgs);
  };

  safeExport = function(name, errorValue, callback) {
    return safeTry(name, callback, function(error) {
      morpheus.logException(name, error);
      return errorValue;
    });
  };

  safeTry = function(name, callback, errorCallback) {
    if ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug) {
      return callback;
    } else {
      return function() {
        try {
          return callback.apply(null, arguments);
        } catch (error) {
          return errorCallback(error);
        }
      };
    }
  };

  translateSugaredJS = function(csmSourceCode) {
    return csmSourceCode;
  };

  create = safeExport('morpheus.editor.create', void 0, function(containerSelector, sourceCode) {
    if (!(sourceCode != null)) {
      sourceCode = "";
    }
    ($(containerSelector)).html("<span><input class='morpheus-source-autocompile' name='morpheus-source-autocompile' type='checkbox' disabled='disabled'><label class='morpheus-source-autocompile-label' for='morpheus-source-autocompile'>Auto-compile</label></span>\n<input class='morpheus-source-compile' name='morpheus-source-compile' type='button' value='Compile'>\n<textarea class='morpheus-source-code' name='morpheus-source-code'>\n" + sourceCode + "\n</textarea>");
  });

  getSourceCode = safeExport('morpheus.editor.getSourceCode', '', function(containerSelector) {
    return (($(containerSelector != null ? containerSelector : document)).find('.morpheus-source-code')).val();
  });

  exports = exports != null ? exports : {};

  exports.create = create;

  exports.getSourceCode = getSourceCode;

  return exports;

}).call(this);


/*
 * Copyright 2011-2013, CircuitHub.com
 */
var morpheus = morpheus || {}; /* Redeclaring morpheus is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

morpheus.renderer = 
// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";

  var clearColor, createScene, exports, gl, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, modelArguments, modelRotate, modelShaders, runScene, safeExport, safeTry, state,
    __slice = [].slice;

  math_sqrt2 = Math.sqrt(2.0);

  math_invsqrt2 = 1.0 / math_sqrt2;

  math_degToRad = Math.PI / 180.0;

  math_radToDeg = 180.0 / Math.PI;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

  morpheus.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logDebug = ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  morpheus.logException = function(locationName, error) {
    var logArgs;
    logArgs = ["Uncaught exception in `" + locationName + "`:\n"];
    logArgs.push((error.message != null ? "" + error.message + "\n" : error));
    if (error.stack != null) {
      logArgs.push(error.stack);
    }
    morpheus.logInternalError.apply(morpheus, logArgs);
  };

  safeExport = function(name, errorValue, callback) {
    return safeTry(name, callback, function(error) {
      morpheus.logException(name, error);
      return errorValue;
    });
  };

  safeTry = function(name, callback, errorCallback) {
    if ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug) {
      return callback;
    } else {
      return function() {
        try {
          return callback.apply(null, arguments);
        } catch (error) {
          return errorCallback(error);
        }
      };
    }
  };

  gl = glQuery;

  state = {
    canvas: null,
    context: null,
    nextFrame: null,
    shader: {
      program: null,
      vs: null,
      fs: null
    },
    rotation: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
    clearColor: [0.2, 0.2, 0.2, 1.0]
  };

  modelShaders = safeExport('morpheus.renderer.modelShaders', false, function(modelName, shaders) {
    var success;
    success = true;
    if (!(state.context != null)) {
      throw "WebGL context is not available.";
    }
    if (!(shaders != null) || shaders.length < 2 || shaders[0].length === 0 || shaders[1].length === 0) {
      return;
    }
    if (!(state.shader.program != null)) {
      state.shader.program = state.context.createProgram();
      state.shader.vs = state.context.createShader(state.context.VERTEX_SHADER);
      state.context.attachShader(state.shader.program, state.shader.vs);
      state.shader.fs = state.context.createShader(state.context.FRAGMENT_SHADER);
      state.context.attachShader(state.shader.program, state.shader.fs);
    }
    state.context.shaderSource(state.shader.vs, shaders[0]);
    state.context.shaderSource(state.shader.fs, shaders[1]);
    state.context.compileShader(state.shader.vs);
    if (!state.context.getShaderParameter(state.shader.vs, state.context.COMPILE_STATUS)) {
      morpheus.logApiError("Shader compile failed:\n" + (state.context.getShaderInfoLog(state.shader.vs)) + "\n" + shaders[0]);
    }
    state.context.compileShader(state.shader.fs);
    if (!state.context.getShaderParameter(state.shader.fs, state.context.COMPILE_STATUS)) {
      morpheus.logApiError("Shader compile failed:\n" + (state.context.getShaderInfoLog(state.shader.fs)) + "\n" + shaders[1]);
    }
    state.context.linkProgram(state.shader.program);
    if (!state.context.getProgramParameter(state.shader.program, state.context.LINK_STATUS)) {
      morpheus.logApiError("Shader link failed:\n" + (state.context.getProgramInfoLog(state.shader.progam)));
    }
    (gl('scene')).shaderProgram(state.shader.program);
    gl.refresh(state.shader.program);
    return success;
  });

  modelArguments = safeExport('morpheus.renderer.modelArguments', void 0, function(modelName, args, params) {
    var arg, i, id, nom, param, paramToUniform, uniformID, unwrap, x, _ref;
    unwrap = function(data) {
      switch (data._tag) {
        case 'tolerance':
        case 'range':
          return data[0];
        default:
          return data;
      }
    };
    paramToUniform = {};
    if (params != null) {
      for (uniformID in params) {
        param = params[uniformID];
        id = unwrap(param)[0];
        paramToUniform[id] = uniformID;
      }
    }
    for (id in args) {
      arg = args[id];
      uniformID = (_ref = paramToUniform[id]) != null ? _ref : id;
      if ((!Array.isArray(arg)) && (typeof arg === 'object') && (arg.min != null) && (arg.max != null)) {
        nom = null;
        if (Array.isArray(arg.min)) {
          nom = (function() {
            var _i, _len, _ref1, _results;
            _ref1 = arg.min;
            _results = [];
            for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
              x = _ref1[i];
              _results.push((x + arg.max[i]) * 0.5);
            }
            return _results;
          })();
        } else {
          nom = (arg.min + arg.max) * 0.5;
        }
        (gl(modelName)).uniform(uniformID, nom);
      } else {
        (gl(modelName)).uniform(uniformID, arg);
      }
    }
  });

  modelRotate = safeExport('morpheus.renderer.modelRotate', void 0, function(modelName, angles) {
    gl.matrix3.rotateZY(state.rotation, state.rotation, angles);
    (gl(modelName)).uniform('model', state.rotation);
  });

  createScene = safeExport('morpheus.renderer.createScene', void 0, function(context) {
    var indices, positions;
    state.context = context;
    positions = [1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0];
    indices = [0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];
    if ((state.vbo != null)) {
      context.deleteBuffer(state.vbo);
    }
    if ((state.ibo != null)) {
      context.deleteBuffer(state.ibo);
    }
    state.vbo = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, state.vbo);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(positions), context.STATIC_DRAW);
    state.ibo = context.createBuffer();
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, state.ibo);
    context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), context.STATIC_DRAW);
    gl.scene({
      'scene': ''
    }).vertexAttrib('position', state.vbo, 9 * 8, gl.FLOAT, 3, false, 0, 0).vertexElem(state.ibo, 6 * 6, gl.UNSIGNED_SHORT, 0).uniform('view', gl.matrix4.newLookAt([10.0, 10.0, 10.0], [0.0, 0.0, 0.0], [0.0, 0.0, 1.0])).uniform('projection', gl.matrix4.newOrtho(-math_sqrt2, math_sqrt2, -math_sqrt2, math_sqrt2, 0.1, 100.0)).uniform('model', state.rotation).triangles();
  });

  runScene = safeExport('morpheus.renderer.runScene', void 0, function(idleCallback) {
    var canvas, _gl;
    _gl = state.context;
    _gl.cullFace(_gl.BACK);
    _gl.enable(_gl.CULL_FACE);
    _gl.enable(_gl.BLEND);
    _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ZERO, _gl.ONE);
    canvas = gl.canvas(state.context);
    canvas.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT).clearColor.apply(canvas, state.clearColor).start('scene', null, null, idleCallback);
  });

  clearColor = function(r, g, b, a) {
    state.clearColor = __slice.call(arguments);
    if (state.context != null) {
      return (gl.canvas(state.context)).clearColor(r, g, b, a);
    }
  };

  exports = exports != null ? exports : {};

  exports.createScene = createScene;

  exports.runScene = runScene;

  exports.modelShaders = modelShaders;

  exports.modelArguments = modelArguments;

  exports.modelRotate = modelRotate;

  exports.clearColor = clearColor;

  exports.getRenderingContext = function() {
    return state.context;
  };

  return exports;

}).call(this);


/*
 * Copyright 2011-2013, CircuitHub.com
 */
var morpheus = morpheus || {}; /* Redeclaring morpheus is fine: behaves like a no-op (https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet) */

morpheus.gui = 
// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";

  var apiInit, canvasInit, constants, controlsArgumentsUpdate, controlsInit, controlsSourceCompile, create, createControls, createEditor, getModelArguments, getModelParameters, gl, init, keyDown, math_degToRad, math_invsqrt2, math_radToDeg, math_sqrt2, mouseCoordsWithinElement, mouseDown, mouseMove, mouseUp, mouseWheel, registerControlEvents, registerDOMEvents, registerEditorEvents, result, safeExport, safeTry, sceneIdle, sceneReset, sceneScript, setModelArguments, state, windowResize, wrapParams,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  math_sqrt2 = Math.sqrt(2.0);

  math_invsqrt2 = 1.0 / math_sqrt2;

  math_degToRad = Math.PI / 180.0;

  math_radToDeg = 180.0 / Math.PI;

  Math.clamp = function(s, min, max) {
    return Math.min(Math.max(s, min), max);
  };

  morpheus.log = ((typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logDebug = ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug && (typeof console !== "undefined" && console !== null) && (console.log != null) ? function() {
    return console.log.apply(console, arguments);
  } : function() {});

  morpheus.logInternalError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiError = ((typeof console !== "undefined" && console !== null) && (console.error != null) ? function() {
    return console.error.apply(console, arguments);
  } : function() {});

  morpheus.logApiWarning = ((typeof console !== "undefined" && console !== null) && (console.warn != null) ? function() {
    return console.warn.apply(console, arguments);
  } : function() {});

  morpheus.logException = function(locationName, error) {
    var logArgs;
    logArgs = ["Uncaught exception in `" + locationName + "`:\n"];
    logArgs.push((error.message != null ? "" + error.message + "\n" : error));
    if (error.stack != null) {
      logArgs.push(error.stack);
    }
    morpheus.logInternalError.apply(morpheus, logArgs);
  };

  safeExport = function(name, errorValue, callback) {
    return safeTry(name, callback, function(error) {
      morpheus.logException(name, error);
      return errorValue;
    });
  };

  safeTry = function(name, callback, errorCallback) {
    if ((typeof morpheusDebug !== "undefined" && morpheusDebug !== null) && morpheusDebug) {
      return callback;
    } else {
      return function() {
        try {
          return callback.apply(null, arguments);
        } catch (error) {
          return errorCallback(error);
        }
      };
    }
  };

  gl = glQuery;

  constants = {
    canvas: {
      defaultSize: [512, 512]
    },
    camera: {
      maxOrbitSpeed: Math.PI * 0.1,
      orbitSpeedFactor: 0.05,
      zoomSpeedFactor: 0.5
    }
  };

  state = {
    scene: null,
    canvas: null,
    viewport: {
      domElement: null,
      mouse: {
        last: [0, 0],
        leftDown: false,
        middleDown: false,
        leftDragDistance: 0,
        middleDragDistance: 0
      }
    },
    editor: {
      domElement: null
    },
    parameters: {
      domElement: null
    },
    api: {
      url: null,
      sourceCode: null
    },
    application: {
      initialized: false,
      sceneInitialized: false
    },
    models: {},
    paths: {
      morpheusUrlRoot: null,
      jsandboxUrl: null
    }
  };

  mouseCoordsWithinElement = function(event) {
    var coords, element, totalOffsetLeft, totalOffsetTop;
    coords = [0, 0];
    if (!event) {
      event = window.event;
      coords = [event.x, event.y];
    } else {
      element = event.target;
      totalOffsetLeft = 0;
      totalOffsetTop = 0;
      while (element.offsetParent) {
        totalOffsetLeft += element.offsetLeft;
        totalOffsetTop += element.offsetTop;
        element = element.offsetParent;
      }
      coords = [event.pageX - totalOffsetLeft, event.pageY - totalOffsetTop];
    }
    return coords;
  };

  sceneScript = safeExport('morpheus.gui: sceneScript', void 0, function(morpheusScriptCode, callback) {
    var csmSourceCode, requestId;
    csmSourceCode = morpheus.generator.translateCSM(state.api.sourceCode, morpheusScriptCode);
    requestId = JSandbox["eval"]({
      data: csmSourceCode,
      callback: function(result) {
        var defaultValue, id, meta, model, oldParam, param, params, uniformID, unwrap, _base, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
        morpheus.logDebug(result);
        if ((_ref = (_base = state.models).scene) == null) {
          _base.scene = {
            shaders: [],
            params: {},
            args: {}
          };
        }
        model = state.models.scene;
        params = (_ref1 = result != null ? (_ref2 = result.attr) != null ? _ref2.params : void 0 : void 0) != null ? _ref1 : {};
        unwrap = function(data) {
          switch (data._tag) {
            case 'tolerance':
            case 'range':
              return data[0];
            default:
              return data;
          }
        };
        _ref3 = model.params;
        for (uniformID in _ref3) {
          oldParam = _ref3[uniformID];
          param = params[uniformID];
          if (!(param != null) || param._tag !== oldParam._tag) {
            _ref4 = unwrap(param != null ? param : oldParam), id = _ref4[0], meta = _ref4[1], defaultValue = _ref4[2];
            delete model.args[id];
          }
        }
        for (uniformID in params) {
          param = params[uniformID];
          _ref5 = unwrap(param), id = _ref5[0], meta = _ref5[1], defaultValue = _ref5[2];
          if (!(__indexOf.call(model.args, id) >= 0)) {
            model.args[id] = defaultValue;
          }
        }
        model.params = params;
        model.shaders = morpheus.generator.compileGLSL(morpheus.generator.compileASM(result), model.params);
        morpheus.renderer.modelShaders('scene', model.shaders);
        morpheus.gui.setModelArguments('scene', model.args);
        controlsInit();
        state.application.sceneInitialized = true;
        if (typeof callback === "function") {
          callback();
        }
      },
      onerror: function(data, request) {
        morpheus.logInternalError("Error compiling the solid model.");
        if (typeof callback === "function") {
          callback("Error compiling the solid model.");
        }
      }
    });
  });

  sceneReset = safeExport('morpheus.gui: sceneReset', void 0, function() {
    return state.models['scene'] = {
      shaders: [],
      params: {},
      args: {}
    };
  });

  windowResize = safeExport('morpheus.gui: windowResize', void 0, function() {});

  mouseDown = safeExport('morpheus.gui: mouseDown', void 0, function(event) {
    state.viewport.mouse.last = [event.clientX, event.clientY];
    switch (event.which) {
      case 1:
        return state.viewport.mouse.leftDown = true;
      case 2:
        return state.viewport.mouse.middleDown = true;
    }
    /* Pick the object under the mouse
    if not state.scene?
      return
    if event.which == 1 # Left mouse button
      coords = mouseCoordsWithinElement event
      state.viewport.mouse.pickRecord = state.scene.pick coords[0], coords[1]
    */

  });

  mouseUp = safeExport('morpheus.gui: mouseUp', void 0, function(event) {
    switch (event.which) {
      case 1:
        state.viewport.mouse.leftDown = false;
        state.viewport.mouse.leftDragDistance = 0;
        break;
      case 2:
        state.viewport.mouse.middleDown = false;
        state.viewport.mouse.middleDragDistance = 0;
    }
  });

  mouseMove = function(event) {
    return safeTry("morpheus.gui: mouseMove", (function() {
      var delta, deltaLength, orbitAngles;
      delta = [event.clientX - state.viewport.mouse.last[0], event.clientY - state.viewport.mouse.last[1]];
      deltaLength = gl.vec2.length(delta);
      if (state.viewport.mouse.leftDown) {
        state.viewport.mouse.leftDragDistance += deltaLength;
      }
      if (state.viewport.mouse.middleDown) {
        state.viewport.mouse.middleDragDistance += deltaLength;
      }
      if (state.viewport.mouse.leftDown && event.which === 1) {
        orbitAngles = [0.0, 0.0];
        gl.vec2.mul(orbitAngles, delta, constants.camera.orbitSpeedFactor / deltaLength);
        orbitAngles = [Math.clamp(orbitAngles[0], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed), Math.clamp(orbitAngles[1], -constants.camera.maxOrbitSpeed, constants.camera.maxOrbitSpeed)];
        if ((isNaN(orbitAngles[0])) || (Math.abs(orbitAngles[0])) === Infinity) {
          orbitAngles[0] = 0.0;
        }
        if ((isNaN(orbitAngles[1])) || (Math.abs(orbitAngles[1])) === Infinity) {
          orbitAngles[1] = 0.0;
        }
        morpheus.renderer.modelRotate('scene', orbitAngles);
      }
      return state.viewport.mouse.last = [event.clientX, event.clientY];
    }), (function(error) {}))();
  };

  mouseWheel = safeExport('morpheus.gui: mouseWheel', void 0, function(event) {
    var delta, zoomDistance;
    delta = event.wheelDelta != null ? event.wheelDelta / -120.0 : Math.clamp(event.detail, -1.0, 1.0);
    zoomDistance = delta * constants.camera.zoomSpeedFactor;
  });

  keyDown = safeExport('morpheus.gui: keyDown', void 0, function(event) {});

  controlsSourceCompile = safeExport('morpheus.gui.controlsSourceCompile', void 0, function() {
    morpheus.gui.sceneScript(morpheus.editor.getSourceCode(state.editor.domElement), function(error) {
      if (error != null) {
        console.error(error);
      }
    });
  });

  controlsArgumentsUpdate = safeExport('morpheus.gui.controlsArgumentsUpdate', void 0, function(event) {
    setModelArguments('scene', parameterize.get(state.parameters.domElement, getModelParameters('scene')));
  });

  registerDOMEvents = function() {
    ($('#morpheus-gui')).on('mousedown', '#morpheus-canvas', mouseDown);
    state.viewport.domElement.addEventListener('mouseup', mouseUp, true);
    state.viewport.domElement.addEventListener('mousemove', mouseMove, true);
    state.viewport.domElement.addEventListener('mousewheel', mouseWheel, true);
    state.viewport.domElement.addEventListener('DOMMouseScroll', mouseWheel, true);
    document.addEventListener('keydown', keyDown, true);
    return window.addEventListener('resize', windowResize, true);
  };

  registerEditorEvents = function() {
    var $container;
    $container = $(state.editor.domElement);
    return ($container.find('.morpheus-source-compile')).on('click', controlsSourceCompile);
  };

  registerControlEvents = function() {
    return parameterize.on('update', state.parameters.domElement, controlsArgumentsUpdate);
  };

  sceneIdle = function() {
    return safeTry("morpheus.gui: sceneIdle", (function() {}), (function(error) {}))();
  };

  canvasInit = function() {
    return windowResize();
  };

  controlsInit = safeExport('morpheus.gui: controlsInit', void 0, function() {
    var c, controls, el, model, modelName, roundDecimals, _i, _len;
    roundDecimals = function(n) {
      var nonzeroDigits, parts, zeroDigits;
      parts = (String(n)).split('.');
      if (parts.length === 1) {
        return parts[0];
      }
      nonzeroDigits = parts[1].match(/[1-9]+/g);
      zeroDigits = parts[1].match(/^0+/);
      if (nonzeroDigits.length === 0) {
        return parts[0];
      }
      if (zeroDigits.length > 0) {
        return "" + parts[0] + "." + zeroDigits[0] + nonzeroDigits[0];
      }
      return "" + parts[0] + "." + nonzeroDigits[0];
    };
    el = state.parameters.domElement;
    if (el != null) {
      controls = (function() {
        var _ref, _results;
        _ref = state.models;
        _results = [];
        for (modelName in _ref) {
          model = _ref[modelName];
          _results.push(parameterize.html(getModelParameters(modelName)));
        }
        return _results;
      })();
      el.innerHTML = "";
      for (_i = 0, _len = controls.length; _i < _len; _i++) {
        c = controls[_i];
        el.appendChild(c);
      }
    }
  });

  apiInit = function(morpheusScriptCode, callback) {
    var $apiLink;
    $apiLink = $("link[rel='api']");
    if (typeof state.paths.morpheusUrlRoot === 'string') {
      state.api.url = state.paths.morpheusUrlRoot.length === 0 || state.paths.morpheusUrlRoot[state.paths.morpheusUrlRoot.length - 1] === '/' ? state.paths.morpheusUrlRoot + 'morpheus-api.min.js' : state.paths.morpheusUrlRoot + '/morpheus-api.min.js';
    } else if ($apiLink.length > 0) {
      state.api.url = $apiLink.attr('href');
    } else {
      state.api.url = 'morpheus-api.min.js';
    }
    return ($.get(state.api.url, void 0, void 0, 'text')).success(function(data, textStatus, jqXHR) {
      state.api.sourceCode = data;
      morpheus.log("Loaded " + state.api.url);
      return typeof callback === "function" ? callback(morpheusScriptCode) : void 0;
    }).error(function() {
      return morpheus.log("Error loading API script");
    });
  };

  init = function(containerEl, canvasEl, callback) {
    var morpheusScriptCode, _ref, _ref1;
    state.viewport.domElement = containerEl;
    state.canvas = canvasEl;
    if (state.canvas != null) {
      state.scene = morpheus.renderer.createScene(state.canvas.getContext('experimental-webgl'));
      morpheus.renderer.runScene(null);
    }
    canvasInit();
    morpheusScriptCode = (_ref = (_ref1 = morpheus.editor) != null ? _ref1.getSourceCode(state.editor.domElement) : void 0) != null ? _ref : "";
    apiInit(morpheusScriptCode, function() {
      if (typeof callback === "function") {
        callback();
      }
      if (!state.application.sceneInitialized) {
        return sceneScript(morpheusScriptCode);
      }
    });
    registerDOMEvents();
    return state.application.initialized = true;
  };

  create = safeExport('morpheus.gui.create', false, function(container, jsandboxUrl, morpheusUrlRoot, fixedWidth, fixedHeight, callback) {
    var containerEl, errorHtml;
    errorHtml = "<div>Could not create Morpheus GUI. Please see the console for error messages.</div>";
    if (!(fixedWidth != null)) {
      fixedWidth = 512;
    }
    if (!(fixedHeight != null)) {
      fixedHeight = 512;
    }
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      containerEl.innerHTML = errorHtml;
      morpheus.logApiError("Morpheus GUI: (ERROR) Invalid container selector '" + container + "' supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      morpheus.logApiWarning("Morpheus GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    }
    if (containerEl === null || containerEl.nodeName !== 'DIV') {
      morpheus.logApiError("Morpheus GUI: (ERROR) Invalid container selector '" + container + "' supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    containerEl.innerHTML = ("<canvas id='morpheus-canvas' width='" + fixedWidth + "' height='" + fixedHeight + "'>\n  <p>This application requires a browser that supports the<a href='http://www.w3.org/html/wg/html5/'>HTML5</a>&lt;canvas&gt; feature.</p>\n</canvas>") + containerEl.innerHTML;
    if (jsandboxUrl != null) {
      state.paths.jsandboxUrl = jsandboxUrl;
    }
    if (morpheusUrlRoot != null) {
      state.paths.morpheusUrlRoot = morpheusUrlRoot;
    }
    if (state.paths.jsandboxUrl != null) {
      JSandbox.create(state.paths.jsandboxUrl);
    }
    init(containerEl, document.getElementById('morpheus-canvas'), callback);
    return true;
  });

  createControls = safeExport('morpheus.gui.createControls', false, function(container) {
    var containerEl;
    if (container !== null && typeof container !== 'string' && (typeof container !== 'object' || container.nodeName !== 'DIV')) {
      morpheus.logApiError("Morpheus GUI: (ERROR) Invalid container selector '" + container + "' supplied, expected type 'string' or dom element of type 'DIV'.");
      return false;
    } else if (container === null) {
      morpheus.logApiWarning("Morpheus GUI: (WARNING) No container element supplied. Creating a div element here...");
    } else {
      containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    }
    if (containerEl === null || containerEl.nodeName !== 'DIV') {
      morpheus.logApiError("Morpheus GUI: (ERROR) Invalid container id '" + container + "' supplied, could not find a matching 'DIV' element in the document.");
      return false;
    }
    if (!(state.parameters.domElement != null)) {
      state.parameters.domElement = containerEl;
    }
    controlsInit();
    registerControlEvents();
    return true;
  });

  createEditor = safeExport('morpheus.gui.createEditor', false, function(container, sourceCode) {
    morpheus.editor.create(container, sourceCode);
    state.editor.domElement = container;
    registerEditorEvents();
    return true;
  });

  wrapParams = function(params) {
    var name, param, _ref;
    return parameterize.form.parameters("", (_ref = parameterize.form).section.apply(_ref, [""].concat(__slice.call((function() {
      var _results;
      _results = [];
      for (name in params) {
        param = params[name];
        _results.push(param);
      }
      return _results;
    })()))));
  };

  getModelParameters = safeExport('morpheus.gui.getModelParameters', {}, function(modelName) {
    var k, params, v, _ref;
    if ((modelName != null) && (state.models[modelName] != null)) {
      return wrapParams(state.models[modelName].params);
    }
    params = {};
    _ref = state.models;
    for (k in _ref) {
      v = _ref[k];
      params[k] = wrapParams(v.params);
    }
    return params;
  });

  getModelArguments = safeExport('morpheus.gui.getModelArguments', {}, function(modelName) {
    var args, k, v, _ref;
    if ((modelName != null) && (state.models[modelName] != null)) {
      return state.models[modelName].args;
    }
    args = {};
    _ref = state.models;
    for (k in _ref) {
      v = _ref[k];
      args[k] = v.args;
    }
    return args;
  });

  setModelArguments = safeExport('morpheus.gui.setModelArguments', {}, function(modelName, args) {
    var dimensionType, globalScale, k, model, v, _render, _scaleArgument, _unwrap;
    globalScale = 0.1;
    _unwrap = function(data) {
      switch (data._tag) {
        case 'tolerance':
        case 'range':
          return data[0];
        default:
          return data;
      }
    };
    dimensionType = {
      real: true,
      dimension1: true,
      dimension2: true,
      dimension3: true,
      vector2: true,
      vector3: true,
      point2: true,
      point3: true,
      pitch1: true,
      pitch2: true,
      pitch3: true,
      angle: false,
      polar: false,
      cylindrical: void 0,
      spherical: void 0,
      integer: false,
      natural: false,
      latice1: false,
      latice2: false,
      latice3: false,
      boolean: false,
      option: false
    };
    _scaleArgument = function(arg, param) {
      var a, tag;
      tag = (_unwrap(param))._tag;
      if (!(dimensionType[tag] != null)) {
        throw "Parameter type " + tag + " is not yet supported.";
      }
      if (!dimensionType[(_unwrap(param))._tag]) {
        return arg;
      }
      if (Array.isArray(arg)) {
        return (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = arg.length; _i < _len; _i++) {
            a = arg[_i];
            _results.push(a * globalScale);
          }
          return _results;
        })();
      } else if (typeof arg === 'object') {
        if (!arg.min && arg.max) {
          throw "Could not find min and max keys for toleranced argument.";
        }
        if (Array.isArray(arg.min)) {
          return {
            min: (function() {
              var _i, _len, _ref, _results;
              _ref = arg.min;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                a = _ref[_i];
                _results.push(a * globalScale);
              }
              return _results;
            })(),
            max: (function() {
              var _i, _len, _ref, _results;
              _ref = arg.max;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                a = _ref[_i];
                _results.push(a * globalScale);
              }
              return _results;
            })()
          };
        } else {
          return {
            min: arg.min * globalScale,
            max: arg.max * globalScale
          };
        }
      }
      return arg * globalScale;
    };
    _render = function(model, args) {
      var arg, id, k, newArgs, param, paramToUniform, uniformID, _ref;
      paramToUniform = {};
      if (model.params != null) {
        _ref = model.params;
        for (uniformID in _ref) {
          param = _ref[uniformID];
          id = _unwrap(param)[0];
          paramToUniform[id] = uniformID;
        }
      }
      newArgs = {};
      for (k in args) {
        arg = args[k];
        newArgs[k] = _scaleArgument(arg, model.params[paramToUniform[k]]);
      }
      return morpheus.renderer.modelArguments(modelName, newArgs, model.params);
    };
    if (!(modelName != null)) {
      for (k in args) {
        v = args[k];
        model = state.models[k];
        if (!(model != null)) {
          throw "No model with the name '" + modelName + "' exists in the scene.";
        }
        _render(model, v);
      }
      return;
    }
    model = state.models[modelName];
    if (!(model != null)) {
      throw "No model with the name '" + modelName + "' exists in the scene.";
    }
    _render(model, args);
  });

  /*
  getModelDefaultArguments = safeExport 'morpheus.gui.getModelParameters', {}, (modelName) ->
    params = state?.models[modelName]?.params
    for name,attr of params
      if not (name in model.args)
        [id,meta,defaultValue] = ["", {}, 0]
        switch attr._tag
          when 'tolerance'
            [id,meta,defaultValue] = attr[0] # unwrap tolerance tag
            if Array.isArray defaultValue.min
              defaultValue = ((defaultValue.min[i] + defaultValue.max[i]) * 0.5 for i in [0...defaultValue.min.length])
            else
              defaultValue = (defaultValue.min + defaultValue.max) * 0.5
          when 'range'
            throw "TODO: Range not yet implemented"
          else
            [id,meta,defaultValue] = attr
        model.args[name] = defaultValue # TODO: handle tolerance value here?
  */


  result = typeof exports !== "undefined" && exports !== null ? exports : {};

  result.create = create;

  result.createControls = createControls;

  result.createEditor = createEditor;

  result.sceneScript = sceneScript;

  result.sceneReset = sceneReset;

  result.getModelParameters = getModelParameters;

  result.getModelArguments = getModelArguments;

  result.setModelArguments = setModelArguments;

  return result;

}).call(this);

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


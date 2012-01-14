/*
 * glQuery-math - A math module from a fluent WebGL engine (https://github.com/glQuery)
 * glQuery-math is free, public domain software (http://creativecommons.org/publicdomain/zero/1.0/)
 * Originally created by Rehno Lindeque of http://www.mischievousmeerkat.com
 */
var glQueryMath = new (function() {
"use strict";

// Define a local copy of glQuery
var glQueryMath = this != null? this : window,
MathMemoryPool = {
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

glQueryMath.vec2 = {};
glQueryMath.vec2.add = function(a,b,dest) {
  dest[0] = a[0] + b[0]; 
  dest[1] = a[1] + b[1];
  return dest;
};
glQueryMath.vec2.subtract = function(a,b,dest) {
  dest[0] = a[0] - b[0];
  dest[1] = a[1] - b[1];
  return dest;
};
glQueryMath.vec2.neg = function(a,dest) {
  dest[0] = -a[0];
  dest[1] = -a[1];
};
glQueryMath.vec2.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1];
};
glQueryMath.vec2.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
};

glQueryMath.vec3 = {};
glQueryMath.vec3.add = function(dest,a,b) {
  dest[0] = a[0] + b[0]; 
  dest[1] = a[1] + b[1];
  dest[2] = a[2] + b[2]; 
  return dest;
};
glQueryMath.vec3.sub = function(dest,a,b) {
  dest[0] = a[0] - b[0];
  dest[1] = a[1] - b[1];
  dest[2] = a[2] - b[2];
  return dest;
};
glQueryMath.vec3.mul = function(dest,a,b) {
  dest[0] = a[0] * b;
  dest[1] = a[1] * b;
  dest[2] = a[2] * b;
  return dest;
};
glQueryMath.vec3.div = function(dest,a,b) {
  dest[0] = a[0] / b;
  dest[1] = a[1] / b;
  dest[2] = a[2] / b;
  return dest;
};
glQueryMath.vec3.neg = function(dest,a) {
  dest[0] = -a[0];
  dest[1] = -a[1];
  dest[2] = -a[2];
  return dest;
};
glQueryMath.vec3.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};
glQueryMath.vec3.cross = function(dest,a,b) {
  dest[0] = a[1] * b[2] - a[2] * b[1];
  dest[1] = a[2] * b[0] - a[0] * b[2];
  dest[2] = a[0] * b[1] - a[1] * b[0];
  return dest;
};
glQueryMath.vec3.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
};
glQueryMath.vec3.normalize = function(dest,a) {
  return glQueryMath.vec3.div(dest, a, glQueryMath.vec3.length(a));
};

glQueryMath.vec4 = {};
glQueryMath.vec4.add = function(a,b,dest) {
  dest[0] = a[0] + b[0]; 
  dest[1] = a[1] + b[1];
  dest[2] = a[2] + b[2]; 
  dest[3] = a[3] + b[3];
  return dest;
};
glQueryMath.vec4.subtract = function(a,b,dest) {
  dest[0] = a[0] - b[0];
  dest[1] = a[1] - b[1];
  dest[2] = a[2] - b[2];
  dest[3] = a[3] - b[3];
  return dest;
};
glQueryMath.vec4.neg = function(a,dest) {
  dest[0] = -a[0];
  dest[1] = -a[1];
  dest[2] = -a[2];
  dest[3] = -a[3];
};
glQueryMath.vec4.dot = function(a,b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};
glQueryMath.vec4.length = function(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
};

// Module for setting 3x3 matrix values

// Axis-angle rotation matrix using the right hand rule
glQueryMath.setMatrix3AxisRotation = function(axis, angle) {
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
glQueryMath.setMatrix3Identity = function() {
  return [
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0];
};

// Module for setting 4x4 matrix values

// Axis-angle rotation matrix using the right hand rule
glQueryMath.setMatrix4AxisRotation = function(axis, angle) {
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
glQueryMath.setMatrix4Identity = function() {
  return [
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0];
};

glQueryMath.setMatrix4Rows = function(r0, r1, r2, r3) {
  return [].concat(r0, r1, r2, r3);
}

glQueryMath.setMatrix4Columns = function(c0, c1, c2, c3) {
  return [
    c0[0], c1[0], c2[0],c3[0],
    c0[1], c1[1], c2[1],c3[1],
    c0[2], c1[2], c2[2],c3[2],
    c0[3], c1[3], c2[3],c3[3]
  ];
}

// Right-handed orthogonal projection matrix
glQueryMath.setMatrix4Ortho = function(left, right, bottom, top, near, far) {
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
glQueryMath.setMatrix4LookAt = function(eye, target, up) {
  // TODO: See if it would be more efficient to try and build the matrix
  //       by rows instead of by columns as is done presently
  var x = MathMemoryPool.vector4[0], 
  y = MathMemoryPool.vector4[1],
  z = MathMemoryPool.vector4[2],
  w = MathMemoryPool.vector4[3];

  glQueryMath.vec3.sub(z, eye, target);
  glQueryMath.vec3.cross(x, up, z);

  // (probably best to normalize z and x after cross product for best numerical accuracy)
  glQueryMath.vec3.normalize(x, x);
  glQueryMath.vec3.normalize(z, z);

  // (no need to normalize y because x and z was already normalized)
  glQueryMath.vec3.cross(y, z, x);
  
  x[3] = -glQueryMath.vec3.dot(x, eye);
  y[3] = -glQueryMath.vec3.dot(y, eye);
  z[3] = -glQueryMath.vec3.dot(z, eye);
  w[0] = 0.0;
  w[1] = 0.0;
  w[2] = 0.0;
  w[3] = 1.0;
  return glQueryMath.setMatrix4Columns(x,y,z,w);
};

// Extend glQuery if it is defined
if (typeof glQuery !== 'undefined' && glQuery != null)
  for(var key in glQueryMath)
    if (glQuery[key] == null)
      glQuery[key] = glQueryMath[key];
return glQueryMath;

})();


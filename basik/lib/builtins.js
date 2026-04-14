"use strict";

var builtinFunctions = {
  TAB: n => Array(Math.floor(n + 1)).join(" "),
  INT: n => Math.floor(n),
  ABS: n => Math.abs(n),
  LEN: n => n.length,
  SIN: n => Math.sin(n),
  CHR$: function(n) {
    n = Math.floor(n);
    // Map C64 PETSCII diagonal graphics characters
    if (n === 205) return '\\';
    if (n === 206) return '/';
    return String.fromCharCode(n);
  },
  _lastRandom: 0.001,
  _xorShiftRand: n => {
    n ^= n >> 12; // a
    n ^= n << 25; // b
    n ^= n >> 27; // c
    return (n%1000/1000);
  },
  RND: n => {
    /*from the Apple ][ BASIC manual:
      if x>0, random number between 0 and 1
      if x=0, repeats last random number
      if x<0, begins new repeatable sequence*/
    if (n !== 0)
      builtinFunctions._lastRandom = Math.random();
    return builtinFunctions._lastRandom;
  },
};

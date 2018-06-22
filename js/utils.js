function deg2rad(deg) {
  return deg*THREE.Math.DEG2RAD;
}

function rad2deg(rad) {
  return rad*THREE.Math.RAD2DEG;
}

function clamp(x, minval, maxval) {
  return Math.max(Math.min(x, maxval), minval);
}

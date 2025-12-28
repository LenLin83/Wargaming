/**
 * 前端層 - 座標轉換
 * Frontend Layer - Coordinate Conversion
 */

/**
 * 經緯度座標
 */
export class LatLon {
  constructor(lat, lon, alt = 0) {
    this.lat = lat;
    this.lon = lon;
    this.alt = alt;
  }
}

/**
 * 笛卡兒座標
 */
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v) {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v) {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiplyScalar(s) {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vector3();
    return new Vector3(this.x / len, this.y / len, this.z / len);
  }

  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

/**
 * WGS84 轉笛卡兒座標（相對座標）
 * @param {LatLon} latLon - 經緯度座標
 * @param {LatLon} origin - 原點經緯度
 * @returns {Vector3} 笛卡兒座標（公尺）
 */
export function wgs84ToCartesian(latLon, origin) {
  const R = 6371000; // 地球半徑（公尺）

  const dx = (latLon.lon - origin.lon) * (Math.PI / 180) * R * Math.cos((latLon.lat * Math.PI) / 180);
  const dy = latLon.alt || 0;
  const dz = (latLon.lat - origin.lat) * (Math.PI / 180) * R;

  return new Vector3(dx, dy, dz);
}

/**
 * 笛卡兒座標轉 WGS84
 * @param {Vector3} position - 笛卡兒座標
 * @param {LatLon} origin - 原點經緯度
 * @returns {LatLon} 經緯度座標
 */
export function cartesianToWgs84(position, origin) {
  const R = 6371000;

  const lat = origin.lat + (position.z / R) * (180 / Math.PI);
  const lon = origin.lon + (position.x / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  const alt = position.y;

  return new LatLon(lat, lon, alt);
}

/**
 * 度轉弧度
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 弧度轉度
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * 限制角度範圍 (0-360)
 */
export function clampAngle(angle) {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * 計算兩點間的方位角
 */
export function calculateBearing(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(dx, dz) * (180 / Math.PI);
}

/**
 * 計算兩點間的距離
 */
export function calculateDistance(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

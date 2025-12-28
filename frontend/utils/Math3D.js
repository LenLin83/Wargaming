/**
 * 前端層 - 3D 數學運算
 * Frontend Layer - 3D Math Operations
 */

import { Vector3 } from './Coordinate.js';

/**
 * 矩陣 4x4
 */
export class Matrix4 {
  constructor() {
    this.elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  /**
   * 建立平移矩陣
   */
  static fromTranslation(x, y, z) {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }

  /**
   * 建立旋轉矩陣（Y 軸）
   */
  static fromRotationY(angleRadians) {
    const m = new Matrix4();
    const c = Math.cos(angleRadians);
    const s = Math.sin(angleRadians);
    m.elements[0] = c;
    m.elements[2] = s;
    m.elements[8] = -s;
    m.elements[10] = c;
    return m;
  }

  /**
   * 建立縮放矩陣
   */
  static fromScale(x, y, z) {
    const m = new Matrix4();
    m.elements[0] = x;
    m.elements[5] = y;
    m.elements[10] = z;
    return m;
  }

  /**
   * 矩陣乘法
   */
  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const result = new Matrix4();

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[i * 4 + k] * b[k * 4 + j];
        }
        result.elements[i * 4 + j] = sum;
      }
    }

    return result;
  }
}

/**
 * 包圍盒 (Axis-Aligned Bounding Box)
 */
export class AABB {
  constructor(min = null, max = null) {
    this.min = min || new Vector3(Infinity, Infinity, Infinity);
    this.max = max || new Vector3(-Infinity, -Infinity, -Infinity);
  }

  /**
   * 從點陣列建立包圍盒
   */
  static fromPoints(points) {
    const box = new AABB();
    for (const p of points) {
      box.expandByPoint(p);
    }
    return box;
  }

  /**
   * 擴展包圍盒以包含點
   */
  expandByPoint(point) {
    this.min.x = Math.min(this.min.x, point.x);
    this.min.y = Math.min(this.min.y, point.y);
    this.min.z = Math.min(this.min.z, point.z);

    this.max.x = Math.max(this.max.x, point.x);
    this.max.y = Math.max(this.max.y, point.y);
    this.max.z = Math.max(this.max.z, point.z);
  }

  /**
   * 檢查是否包含點
   */
  containsPoint(point) {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  /**
   * 取得中心點
   */
  getCenter() {
    return new Vector3(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
      (this.min.z + this.max.z) / 2
    );
  }

  /**
   * 取得尺寸
   */
  getSize() {
    return new Vector3(
      this.max.x - this.min.x,
      this.max.y - this.min.y,
      this.max.z - this.min.z
    );
  }
}

/**
 * 射線
 */
export class Ray {
  constructor(origin = null, direction = null) {
    this.origin = origin || new Vector3();
    this.direction = direction || new Vector3(0, 0, 1);
  }

  /**
   * 射線與平面相交
   */
  intersectPlane(planeNormal, planePoint) {
    const denom = planeNormal.x * this.direction.x +
                  planeNormal.y * this.direction.y +
                  planeNormal.z * this.direction.z;

    if (Math.abs(denom) < 0.0001) {
      return null; // 平行
    }

    const t = ((planePoint.x - this.origin.x) * planeNormal.x +
               (planePoint.y - this.origin.y) * planeNormal.y +
               (planePoint.z - this.origin.z) * planeNormal.z) / denom;

    if (t < 0) {
      return null; // 背向
    }

    return new Vector3(
      this.origin.x + t * this.direction.x,
      this.origin.y + t * this.direction.y,
      this.origin.z + t * this.direction.z
    );
  }
}

/**
 * 線性插值
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 向量線性插值
 */
export function lerpVector3(v1, v2, t) {
  return new Vector3(
    lerp(v1.x, v2.x, t),
    lerp(v1.y, v2.y, t),
    lerp(v1.z, v2.z, t)
  );
}

/**
 * 角度插值（最短路徑）
 */
export function lerpAngle(a, b, t) {
  const d = b - a;
  const result = a + ((d + 180) % 360 - 180) * t;
  return (result + 360) % 360;
}

/**
 * 平滑阻尼
 */
export function damp(current, target, smoothing, deltaTime) {
  return current + (target - current) * smoothing * deltaTime;
}

/**
 * 夾緊數值
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 符號函數
 */
export function sign(value) {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/**
 * 平滑階梯函數
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

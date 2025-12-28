/**
 * 前端層 - 配置管理
 * Frontend Layer - Configuration
 */

/**
 * 應用程式配置
 */
export const Config = {
  // ========== 應用程式設定 ==========
  app: {
    name: '兵棋沙盤推演系統',
    version: '1.0.0',
    debug: true
  },

  // ========== 3D 渲染設定 ==========
  render: {
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    backgroundColor: 0x1a1a2e,
    fogColor: 0x1a1a2e,
    fogNear: 500,
    fogFar: 2000
  },

  // ========== 攝影機設定 ==========
  camera: {
    fov: 60,
    near: 0.1,
    far: 5000,
    position: { x: 0, y: 200, z: 300 },
    target: { x: 0, y: 0, z: 0 }
  },

  // ========== 地形設定 ==========
  terrain: {
    width: 1000,
    height: 1000,
    segments: 100,
    color: 0x3d5c3d,
    wireframe: false
  },

  // ========== LOD 設定 ==========
  lod: {
    enabled: true,
    levels: [
      {
        name: 'strategic',
        minDistance: 500,
        showModel: false,
        showSymbol: true,
        symbolSize: 32
      },
      {
        name: 'operational',
        minDistance: 200,
        showModel: false,
        showSymbol: true,
        symbolSize: 48
      },
      {
        name: 'tactical',
        minDistance: 50,
        showModel: true,
        showSymbol: true,
        symbolSize: 32
      },
      {
        name: 'detail',
        minDistance: 0,
        showModel: true,
        showSymbol: true,
        symbolSize: 24
      }
    ]
  },

  // ========== 單位設定 ==========
  unit: {
    // 預設模型（簡單形狀）
    defaultModel: {
      type: 'box',
      size: { x: 4, y: 3, z: 6 },
      color: 0x4a5568
    },
    // 符號設定
    symbol: {
      defaultSize: 32,
      offsetY: 5,
      opacity: 0.9
    }
  },

  // ========== 控制設定 ==========
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    rotateSpeed: 0.5,
    panSpeed: 1.0,
    zoomSpeed: 1.0,
    minDistance: 10,
    maxDistance: 1000,
    maxPolarAngle: Math.PI / 2 - 0.01, // 不允許穿入地下
    minPolarAngle: 0.1
  },

  // ========== 網格設定 ==========
  grid: {
    show: true,
    size: 1000,
    divisions: 50,
    color: 0x444444,
    opacity: 0.3
  },

  // ========== 光照設定 ==========
  lights: {
    ambient: {
      color: 0x404040,
      intensity: 0.5
    },
    directional: {
      color: 0xffffff,
      intensity: 1.0,
      position: { x: 100, y: 200, z: 100 }
    },
    hemisphere: {
      skyColor: 0x87ceeb,
      groundColor: 0x3d5c3d,
      intensity: 0.3
    }
  },

  // ========== 效能設定 ==========
  performance: {
    targetFPS: 60,
    maxUnits: 1000,
    frustumCulling: true,
    instancedRendering: false
  }
};

/**
 * 更新配置
 */
export function updateConfig(path, value) {
  const keys = path.split('.');
  let obj = Config;
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
}

/**
 * 取得配置值
 */
export function getConfig(path) {
  const keys = path.split('.');
  let obj = Config;
  for (const key of keys) {
    if (obj === undefined) return undefined;
    obj = obj[key];
  }
  return obj;
}

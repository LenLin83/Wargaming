/**
 * 共享層 - 枚舉定義
 * Shared Layer - Enumerations
 *
 * 此模組包含跨層使用的枚舉定義
 * This module contains enum definitions used across layers
 */

/**
 * 單位層級
 */
export const UnitLevel = {
  THEATER: 'theater',       // 戰區
  ARMY: 'army',             // 軍團
  CORPS: 'corps',           // 軍
  DIVISION: 'division',     // 師
  BRIGADE: 'brigade',       // 旅
  REGIMENT: 'regiment',     // 團
  BATTALION: 'battalion',   // 營
  COMPANY: 'company',       // 連
  PLATOON: 'platoon',       // 排
  SQUAD: 'squad',          // 班
  TEAM: 'team',            // 火力組
  VEHICLE: 'vehicle'       // 單車/單兵
};

/**
 * 兵種
 */
export const ServiceBranch = {
  ARMY: 'army',           // 陸軍
  NAVY: 'navy',           // 海軍
  AIR_FORCE: 'air_force', // 空軍
  MARINE: 'marine',       // 海軍陸戰隊
  SPECIAL_FORCES: 'special_forces', // 特種部隊
  COAST_GUARD: 'coast_guard' // 海巡
};

/**
 * 身份（友敵識別）
 */
export const Identity = {
  FRIEND: '0',      // 友軍（青色）
  HOSTILE: '1',     // 敵軍（紅色）
  NEUTRAL: '2',     // 中立（綠色）
  UNKNOWN: '3'      // 未知（黃色）
};

/**
 * 戰鬥態勢
 */
export const CombatPosture = {
  ATTACK: 'attack',       // 攝擊
  DEFEND: 'defend',       // 防禦
  DELAY: 'delay',         // 遲滯
  WITHDRAW: 'withdraw',   // 撤退
  SCREEN: 'screen',       // 掩護
  GUARD: 'guard',         // 警戒
  RESERVE: 'reserve',     // 預備隊
  REST: 'rest',          // 休息整補
  RECON: 'recon'         // 偵查
};

/**
 * 移動狀態
 */
export const MovementState = {
  STATIONARY: 'stationary',  // 駐止
  MOVING: 'moving',         // 移動中
  HALTED: 'halted',         // 暫停
  EMBARKING: 'embarking',   // 裝載中
  DISEMBARKING: 'disembarking' // 卸載中
};

/**
 * 戰術圖形類型
 */
export const GraphicType = {
  // 點位
  POINT: 'point',
  WAYPOINT: 'waypoint',
  CHECKPOINT: 'checkpoint',
  RALLY_POINT: 'rally_point',
  OBJECTIVE: 'objective',

  // 線條
  LINE: 'line',
  AXIS_OF_ADVANCE: 'axis_of_advance',
  BOUNDARY: 'boundary',
  ROUTE: 'route',
  PHASE_LINE: 'phase_line',

  // 箭頭
  ARROW: 'arrow',
  ATTACK_ARROW: 'attack_arrow',
  MAIN_EFFORT: 'main_effort',

  // 區域
  AREA: 'area',
  AO: 'ao',               // 作戰區域
  CIRCULAR: 'circular'     // 圓形區域
};

/**
 * LOD 級別
 */
export const LODLevel = {
  STRATEGIC: 'strategic',     // 戰略視圖 (>500m)
  OPERATIONAL: 'operational', // 作戰視圖 (200-500m)
  TACTICAL: 'tactical',       // 戰術視圖 (50-200m)
  DETAIL: 'detail'           // 詳細視圖 (<50m)
};

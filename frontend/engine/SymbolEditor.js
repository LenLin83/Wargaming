/**
 * 前端層 - 符號編輯器
 * Frontend Layer - Symbol Editor
 * 負責：兵棋符號編輯、預覽、生成
 */

import { Identity, UnitLevel } from '../../shared/Enums.js';
import * as THREE from 'three';

/**
 * SIDC 代碼結構說明
 * SIDC = Symbol Identification Coding Scheme (15位字母格式 - APP-6/MIL-STD-2525)
 *
 * 位置   說明                    範例
 * ---------------------------------------
 * 1      編碼方案                S = Standard
 * 2      身份/友敵              F=友, H=敵, N=中立, U=未知
 * 3      戰鬥維度              G=地面, A=空中, S=海上, U=水下
 * 4      狀態                    P=現行, A=計畫中
 * 5-10   兵種/功能代碼          UCI----=步兵, UCA----=裝甲, 等
 * 11-12  層級補充碼              留空或填充
 * 13-14  層級                    D=班, E=排, F=連, G=營, H=旅, I=師, J=軍
 * 15     指揮指標                留空
 */

/**
 * 身份/友敵選項
 */
export const IdentityOptions = [
  { value: Identity.FRIEND, label: '友軍', color: '#00ffff', sidc: 'F' },
  { value: Identity.HOSTILE, label: '敵軍', color: '#ff0000', sidc: 'H' },
  { value: Identity.NEUTRAL, label: '中立', color: '#00ff00', sidc: 'N' },
  { value: Identity.UNKNOWN, label: '未知', color: '#ffff00', sidc: 'U' }
];

/**
 * 單位層級選項 (Echelon)
 */
export const LevelOptions = [
  { value: 'theater', label: '戰區', sidc: 'K' },
  { value: 'army_group', label: '集團軍', sidc: 'J' },
  { value: 'army', label: '軍團', sidc: 'I' },
  { value: 'corps', label: '軍', sidc: 'H' },
  { value: 'division', label: '師', sidc: 'G' },
  { value: 'brigade', label: '旅', sidc: 'F' },
  { value: 'regiment', label: '團', sidc: 'E' },
  { value: 'battalion', label: '營', sidc: 'D' },
  { value: 'company', label: '連', sidc: 'C' },
  { value: 'platoon', label: '排', sidc: 'B' },
  { value: 'squad', label: '班/組', sidc: 'A' },
  { value: 'team', label: '火炮/小組', sidc: '-' }
];

/**
 * 戰鬥維度選項
 */
export const DimensionOptions = [
  { value: 'ground', label: '地面部隊', sidc: 'G' },
  { value: 'air', label: '空中部隊', sidc: 'A' },
  { value: 'sea', label: '海上部隊', sidc: 'S' },
  { value: 'subsurface', label: '水下部隊', sidc: 'U' }
];

/**
 * 兵種類型選項 (地面部隊)
 * Function ID 格式: 6位代碼
 */
export const BranchTypeOptions = [
  // 步兵
  { value: 'UCI----', label: '步兵', sidc: 'UCI----' },
  { value: 'UCIM---', label: '機械化步兵', sidc: 'UCIM---' },
  { value: 'UCZ----', label: '摩托化步兵', sidc: 'UCZ----' },

  // 裝甲
  { value: 'UCA----', label: '裝甲/戰車', sidc: 'UCA----' },
  { value: 'UCR----', label: '裝甲騎兵/偵察', sidc: 'UCR----' },

  // 砲兵
  { value: 'UCF----', label: '砲兵', sidc: 'UCF----' },
  { value: 'UCFM---', label: '自走砲兵', sidc: 'UCFM---' },
  { value: 'UCFZ---', label: '火箭砲兵', sidc: 'UCFZ---' },

  // 防空
  { value: 'UCK----', label: '防空砲兵', sidc: 'UCK----' },

  // 工兵
  { value: 'UCE----', label: '工兵', sidc: 'UCE----' },

  // 陸軍航空
  { value: 'UCV----', label: '陸軍航空', sidc: 'UCV----' },

  // 通用
  { value: 'UU-----', label: '戰鬥支援', sidc: 'UU-----' }
];

/**
 * 狀態修飾符選項
 */
export const StatusModifierOptions = [
  { value: '00', label: '正常', sidc: '00' },
  { value: '10', label: '作戰中/攻擊', sidc: '10' },
  { value: '20', label: '預備', sidc: '20' },
  { value: '30', label: '損毀/摧毀', sidc: '30' },
  { value: '40', label: '補給中', sidc: '40' },
  { value: '50', label: '偵查中', sidc: '50' },
  { value: '60', label: '佔領中', sidc: '60' }
];

/**
 * 指揮指標選項
 */
export const CommandIndicatorOptions = [
  { value: '0', label: '非指揮官', sidc: '0' },
  { value: '1', label: '指揮官/領隊', sidc: '1' }
];

/**
 * 編制類型選項
 */
export const CommandTypeOptions = [
  { value: 'unit', label: '單位' },
  { value: 'team', label: '小組' },
  { value: 'crew', label: '組員' }
];

export class SymbolEditor {
  constructor(eventBus) {
    this.eventBus = eventBus;

    // 當前編輯的符號屬性
    this.currentSymbol = {
      affiliation: Identity.FRIEND,  // 身份
      dimension: 'ground',            // 戰鬥維度
      status: 'P',                   // 狀態 (P=現行, A=計畫中)
      branchType: 'UCI----',          // 兵種類型 (預設步兵)
      level: UnitLevel.BATTALION,      // 層級
      echelon: 'D'                    // Echelon 代碼
    };

    this.previewSprite = null;
    this.previewCanvas = null;
  }

  /**
   * 生成 SIDC 代碼 (15位字母格式 - APP-6/MIL-STD-2525)
   *
   * 格式: S + Affiliation + Dimension + Status + FunctionID (6位) + Echelon
   * 範例: SFGPUCI----D = 友軍地面現行步兵營
   */
  generateSIDC() {
    const {
      affiliation,
      dimension,
      status,
      branchType,
      echelon
    } = this.currentSymbol;

    const identityData = IdentityOptions.find(opt => opt.value === affiliation) || IdentityOptions[0];
    const dimensionData = DimensionOptions.find(opt => opt.value === dimension) || DimensionOptions[0];
    const branchData = BranchTypeOptions.find(opt => opt.value === branchType) || BranchTypeOptions[0];

    // 組合 15位 SIDC
    const sidc =
      'S' +                    // Position 1: Standard
      identityData.sidc +       // Position 2: Affiliation (F/H/N/U)
      dimensionData.sidc +      // Position 3: Dimension (G/A/S/U)
      status +                  // Position 4: Status (P/A)
      branchData.sidc +         // Position 5-10: Function ID (6位)
      '--' +                    // Position 11-12: 補充碼
      echelon;                  // Position 13: Echelon (D/E/F/G/H/I/J/etc.)

    return sidc;
  }

  /**
   * 更新符號屬性
   */
  updateProperty(key, value) {
    // 如果更新 level，需要同步更新 echelon
    if (key === 'level') {
      this.currentSymbol.level = value;
      const levelData = LevelOptions.find(opt => opt.value === value) || LevelOptions[7];
      this.currentSymbol.echelon = levelData.sidc;
    } else {
      this.currentSymbol[key] = value;
    }
    const sidc = this.generateSIDC();

    // 觸發更新事件
    this.eventBus.emit('symbol-editor:changed', {
      property: key,
      value: value,
      sidc: sidc
    });

    return sidc;
  }

  /**
   * 取得當前 SIDC
   */
  getCurrentSIDC() {
    return this.generateSIDC();
  }

  /**
   * 設定 SIDC 並解析 (15位字母格式)
   */
  setSIDC(sidc) {
    if (!sidc || sidc.length !== 15) {
      console.warn('無效的 SIDC 代碼:', sidc);
      return;
    }

    // 解析 15位字母 SIDC
    // SFGPUCI----D
    // 012345678901234

    this.currentSymbol.affiliation = this._parseAffiliation(sidc[1]);      // Position 1: Affiliation
    this.currentSymbol.dimension = this._parseDimension(sidc[2]);          // Position 2: Dimension
    this.currentSymbol.status = sidc[3];                                  // Position 3: Status
    this.currentSymbol.branchType = sidc.substring(4, 10);                // Position 4-9: Function ID
    this.currentSymbol.echelon = sidc[13] || '-';                         // Position 13: Echelon

    // 根據 echelon 找到對應的 level
    this.currentSymbol.level = this._parseEchelon(this.currentSymbol.echelon);

    return this.currentSymbol;
  }

  /**
   * 解析身份
   */
  _parseAffiliation(code) {
    const found = IdentityOptions.find(opt => opt.sidc === code);
    return found ? found.value : Identity.FRIEND;
  }

  /**
   * 解析戰鬥維度
   */
  _parseDimension(code) {
    const found = DimensionOptions.find(opt => opt.sidc === code);
    return found ? found.value : 'ground';
  }

  /**
   * 解析層級 (Echelon 字母)
   */
  _parseEchelon(code) {
    const found = LevelOptions.find(opt => opt.sidc === code);
    return found ? found.value : UnitLevel.BATTALION;
  }

  /**
   * 取得當前設定
   */
  getCurrentSettings() {
    return { ...this.currentSymbol, sidc: this.generateSIDC() };
  }

  /**
   * 銷毀
   */
  dispose() {
    if (this.previewSprite) {
      this.previewSprite.material.dispose();
    }
  }
}

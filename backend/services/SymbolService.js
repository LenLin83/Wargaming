/**
 * 後端層 - 符號業務服務
 * Backend Layer - Symbol Business Service
 */

import { Identity } from '../../shared/Enums.js';

/**
 * 符號業務服務
 * 負責：SIDC 解析、符號資訊、顏色管理
 */
export class SymbolService {
  constructor() {
    // 符號快取
    this.cache = new Map();
  }

  /**
   * 解析 SIDC 代碼
   */
  parseSIDC(sidc) {
    if (sidc.length !== 20) {
      throw new Error(`SIDC 長度錯誤: ${sidc}`);
    }

    return {
      version: sidc[0],           // 標準版本
      identity: sidc[1],          // 身份
      exercise: sidc[2],          // 戰鬥態樣
      domain: sidc.slice(3, 5),   // 領域 (10=陸戰, 30=空戰, 50=海戰)
      entityType: sidc.slice(5, 10),  // 實體類型
      specificType: sidc.slice(10, 14), // 特定類型
      modifier: sidc.slice(14, 17),    // 修飾符
      status: sidc.slice(17, 20)       // 狀態
    };
  }

  /**
   * 取得身份對應的顏色
   */
  getIdentityColor(identity) {
    switch (identity) {
      case Identity.FRIEND:
        return '#00FFFF';  // 青色（友軍）
      case Identity.HOSTILE:
        return '#FF0000';  // 紅色（敵軍）
      case Identity.NEUTRAL:
        return '#00FF00';  // 綠色（中立）
      case Identity.UNKNOWN:
        return '#FFFF00';  // 黃色（未知）
      default:
        return '#FFFFFF';  // 白色（預設）
    }
  }

  /**
   * 取得 SIDC 的顏色
   */
  getSIDCColor(sidc) {
    const parsed = this.parseSIDC(sidc);
    return this.getIdentityColor(parsed.identity);
  }

  /**
   * 驗證 SIDC
   */
  validateSIDC(sidc) {
    if (typeof sidc !== 'string') return false;
    if (sidc.length !== 20) return false;
    if (!/^[0-9A-Z]*$/.test(sidc)) return false;
    return true;
  }

  /**
   * 建立預設 SIDC
   */
  createDefaultSIDC(options = {}) {
    const {
      identity = Identity.FRIEND,
      domain = '10',      // 陸戰
      entityType = '00015'  // 裝甲
    } = options;

    return '3' + identity + '0' + domain + entityType + '0000000000';
  }

  /**
   * 修改 SIDC 的特定欄位
   */
  modifySIDC(sidc, modifications) {
    const parsed = this.parseSIDC(sidc);

    let result = sidc;

    if (modifications.identity !== undefined) {
      result = modifications.identity + result.slice(1);
    }
    if (modifications.domain !== undefined) {
      result = result.slice(0, 3) + modifications.domain + result.slice(5);
    }
    if (modifications.entityType !== undefined) {
      result = result.slice(0, 5) + modifications.entityType + result.slice(10);
    }

    return result;
  }

  /**
   * 取得 SIDC 的顯示資訊
   */
  getSIDCInfo(sidc) {
    const parsed = this.parseSIDC(sidc);
    const info = {
      sidc: sidc,
      color: this.getSIDCColor(sidc),
      parsed: parsed
    };

    // 身份說明
    switch (parsed.identity) {
      case Identity.FRIEND:
        info.identityLabel = '友軍';
        break;
      case Identity.HOSTILE:
        info.identityLabel = '敵軍';
        break;
      case Identity.NEUTRAL:
        info.identityLabel = '中立';
        break;
      case Identity.UNKNOWN:
        info.identityLabel = '未知';
        break;
    }

    // 領域說明
    switch (parsed.domain) {
      case '10':
        info.domainLabel = '陸戰';
        break;
      case '30':
        info.domainLabel = '空戰';
        break;
      case '50':
        info.domainLabel = '海戰';
        break;
      default:
        info.domainLabel = '其他';
    }

    return info;
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
  }
}

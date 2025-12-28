# Wargaming - 兵棋沙盤推演系統

![License](https://img.shields.io/badge/license-教育使用-blue)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey)

一套專業的軍事模擬與輔助決策工具，提供視覺化、標準化的 3D 兵棋沙盤，實現戰鬥序列（ORBAT）的數位化管理。

## 功能特色

- **符號編輯器**: 支援 APP-6/MIL-STD-2525 標準的軍事符號生成
- **符號庫**: 儲存並重複使用常用符號
- **組織編輯器**: 層級式樹狀圖管理戰鬥序列（ORBAT）
- **3D 沙盤**: Three.js 驅動的地形與單位視覺化
- **拖放部署**: 直觀的從 ORBAT 樹拖曳至 3D 地圖
- **資料持久化**: 基於 LocalStorage 的本地儲存

## 技術堆疊

| 層級 | 技術 |
|------|------|
| **前端** | Vanilla JavaScript + Three.js |
| **3D 引擎** | Three.js |
| **符號生成** | milsymbol.js |
| **狀態管理** | EventBus 模式 |
| **儲存** | LocalStorage API |
| **建置工具** | Vite |

## 系統架構

系統採用 **三層架構**：

```
UI 層 (ui/) → 前端層 (frontend/) → 後端層 (backend/)
```

所有跨層通訊使用 **EventBus** 模式以實現鬆耦合。

### 專案結構

```
Wargaming/
├── backend/              # 資料模型與業務服務
│   ├── data/            # 列舉、場景、單位、戰術圖形
│   ├── repositories/    # LocalStorage、MemoryStorage
│   └── services/        # ORBAT、場景、符號服務
├── frontend/            # 3D 引擎與核心邏輯
│   ├── core/            # App、Config、EventBus
│   ├── engine/          # 符號、場景、地形、單位引擎
│   └── utils/           # 座標、數學、UUID 工具
├── ui/                  # DOM 操作與 UI 管理器
│   └── managers/        # ORBAT、屬性、符號編輯器 UI
├── css/                 # 樣式表
├── docs/                # 文件
├── js/                  # 進入點 (main.js)
└── index.html           # 主 HTML 頁面
```

## SIDC 代碼格式

系統使用 **15 字元字母格式**的 SIDC 代碼（APP-6/MIL-STD-2525）：

```
S + 陣營 + 維度 + 狀態 + 功能碼(6字元) + 階層
```

範例：`SFGPUCI----G` = 友軍地面現行步兵營

```
位置 1:    S (標準)
位置 2:    F/H/N/U (友軍/敵軍/中立/未知)
位置 3:    G/A/S/U (地面/空中/海上/水下)
位置 4:    P/A (現行/計畫中)
位置 5-10: 功能碼 (如 UCI---- = 步兵)
位置 11-16: 階層字母 (D=班, E=排, F=連, G=營, H=旅, I=師, J=軍)
```

## 快速開始

### 前置需求

- Node.js 16+
- npm 或 yarn

### 安裝

```bash
# 安裝相依套件
npm install
```

### 開發模式

```bash
# 啟動開發伺服器 (執行於 http://localhost:3000)
npm run dev
```

### 建置

```bash
# 建置生產版本
npm run build
```

## 使用說明

### 符號編輯器

1. 選擇 **陣營**: 友軍/敵軍/中立/未知
2. 選擇 **戰鬥維度**: 地面/空中/海上/水下
3. 選擇 **兵種**: 根據維度動態變化
4. 選擇 **階層**: 從班到軍
5. 輸入 **部隊番號**和**上級單位**
6. 點擊 **「加入符號庫」**儲存供日後使用

### 組織編輯器

1. 輸入組織名稱
2. 從**符號來源**拖曳符號到組織樹
3. 第一個符號成為根節點
4. 拖曳到現有單位上可新增為子單位
5. 點擊**儲存**按鈕持久化組織

## 瀏覽器支援

| 瀏覽器 | 最低版本 |
|-------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

## 文件

- [CLAUDE.md](./CLAUDE.md) - Claude Code 開發者指南
- [docs/00-專案企劃書.md](./docs/00-專案企劃書.md) - 專案企劃書
- [docs/01-資料結構規格.md](./docs/01-資料結構規格.md) - 資料結構規格
- [docs/02-技術架構.md](./docs/02-技術架構.md) - 技術架構文件

## 貢獻

本專案僅供教育與研究使用。

## 授權

僅供教育使用

## 作者

**LenLin83**

---

使用 ❤️ 建構，基於 Three.js 和 milsymbol.js

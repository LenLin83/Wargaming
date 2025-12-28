# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev
```

## Architecture Overview

This is a **military wargame sandbox system** for tactical simulation and ORBAT (Order of Battle) management. The codebase follows a **three-layer architecture**:

```
UI Layer (ui/) → Frontend Layer (frontend/) → Backend Layer (backend/)
```

### Layer Communication

All inter-layer communication uses the **EventBus** pattern:
- UI emits events like `ui:add-orbat-unit`, `ui:update-unit`
- Frontend handles 3D rendering and emits events like `ENGINE_RENDER_TICK`
- Backend services handle data and emit events like `backend:unit:added`

**Never directly import from a different layer.** Use EventBus for cross-layer communication.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `backend/` | Data models, business services, repositories (ORBAT, Scene, Symbol services) |
| `frontend/` | 3D engine (Three.js), event bus, core app logic |
| `ui/` | DOM manipulation, UI managers (ORBAT tree, property panels, Symbol editor) |
| `js/` | Entry point (`main.js`) - initializes all layers |
| `index.html` | Main HTML page with canvas element |

### Entry Point Flow

`js/main.js` → initializes backend services → creates `App` instance → `App.initialize('main-canvas')` → sets up event listeners

## SIDC Code Format (Critical)

**The system uses 15-character letter format for SIDC codes (APP-6/MIL-STD-2525)**

**Current format (matching test.html):**
```
S + Affiliation + Dimension + Status + FunctionID (6 chars) + Echelon
```

Example: `SFGPUCI----G` = 友軍地面現行步兵營

```
Position 1:    S (Standard)
Position 2:    F/H/N/U (Friend/Hostile/Neutral/Unknown)
Position 3:    G/A/S/U (Ground/Air/Sea/Subsurface)
Position 4:    P/A (Present/Anticipated)
Position 5-10: Function ID (e.g., UCI---- = infantry, UCA---- = armor)
Position 11-16: Echelon letter (D=班, E=排, F=連, G=營, H=旅, I=師, J=軍)
```

**Note:** The echelon letter is appended directly to the end (position 11-16 in the full string, character index 15).

**Echelon mapping (test.html format):**

| Letter | Display | echelonName | Description |
|--------|---------|--------------|-------------|
| - | - 無 - | "" | No echelon |
| D | 班 | "team" | Squad/Team |
| E | 排 | "squad" | Platoon |
| F | 連 | "platoon" | Company |
| G | 營 | "company" | Battalion |
| H | 旅 | "battalion" | Regiment/Brigade |
| I | 師 | "regiment" | Division |
| J | 軍 | "brigade" | Corps |

### Common Mistakes

- **Wrong:** Using 20-digit numeric format (e.g., `10031000151211000020`)
- **Wrong:** Using the old `--` supplemental codes format
- **Correct:** `SFGPUCI----G` (echelon `G` for battalion at the end)

## Symbol Generation

Symbols are generated using **milsymbol.js** (loaded via CDN as global `ms` object):

```javascript
// For Canvas (used in 3D scene)
const symbol = new window.ms.Symbol(sidc, {
  size: 100,
  echelon: "company"  // Use full name, NOT letter code
});
const canvas = symbol.asCanvas();

// For SVG (used in symbol editor preview)
const symbol = new window.ms.Symbol(sidc, {
  size: 200,
  uniqueDesignation: "101",  // Unit designation
  higherFormation: "601旅",   // Higher formation
  echelon: "company"          // Full echelon name
});
const svgString = symbol.asSVG();
```

**Important:** The `echelon` parameter requires the **full name** (e.g., "company", "battalion"), NOT the letter code.

Key files:
- `frontend/engine/SymbolEngine.js` - Generates Three.js textures from SIDC
- `frontend/engine/SymbolEditor.js` - SIDC generation with option exports
- `ui/managers/SymbolEditorUI.js` - Symbol editor UI management

## Symbol Editor UI

The symbol editor is located at `ui/managers/SymbolEditorUI.js` and follows the structure of `test.html`.

### Control Elements

| Element | ID | Options |
|---------|----|----|
| 陣營 (Affiliation) | `affiliation-select` | F=友軍, H=敵軍, N=中立, U=未知 |
| 戰鬥維度 (Dimension) | `dimension-select` | G=地面, A=空中, S=海上, U=水下 |
| 兵種/功能 (Function) | `function-select` | **Dynamically updates based on dimension** |
| 層級 (Echelon) | `echelon-select` | D=班, E=排, F=連, G=營, H=旅, I=師, J=軍 |
| 部隊番號 (Designation) | `designation-input` | Text input for unit number |
| 上級單位 (Higher Formation) | `higher-formation-input` | Text input for parent unit |
| 狀態 (Status) | `status-select` | 空白=現行, 1=計畫中 |

### Action Buttons

| Button | ID | Function |
|--------|----|----|
| 應用到選中單位 | `apply-btn` | Apply current symbol to selected unit |
| 複製 SIDC | `copy-sidc-btn` | Copy SIDC code to clipboard |
| 複製 SVG | `copy-svg-btn` | Copy SVG to clipboard |
| 新增到當前組織 | `add-to-org-btn` | Add symbol directly to organization tree |
| **加入符號庫** | `add-to-library-btn` | Save current symbol to library for reuse |

### Dynamic Function Options

Function options change based on the selected battle dimension:

```javascript
const DimensionFunctionMaps = {
  "G": [ // 地面部隊
    "步兵", "機械化步兵", "裝甲/戰車", "陸軍航空",
    "砲兵", "工兵", "偵察", "戰鬥支援"
  ],
  "A": [ // 空中部隊
    "定翼機", "旋翼機", "無人機", "攻擊機",
    "轟炸機", "戰鬥機"
  ],
  "S": [ // 海上水面部隊
    "水面作戰艦", "兩棲作戰艦", "水雷戰艦艇",
    "巡防艦", "戰列艦"
  ],
  "U": [ // 水下部隊
    "潛艦", "核動力潛艦", "柴電潛艦"
  ]
};
```

### SymbolEditorUI Data Structure

```javascript
this.currentValues = {
  affiliation: 'F',    // F/H/N/U
  dimension: 'G',      // G/A/S/U
  functionId: 'UCI----', // Function ID code
  echelon: 'G',        // D/E/F/G/H/I/J or -
  designation: '',     // Unit designation text
  higherFormation: '', // Higher formation text
  status: ''           // ''=Present, '1'=Anticipated
};
```

### TestEchelonOptions

```javascript
const TestEchelonOptions = [
  { value: "-", text: "- 無 -", echelonName: "" },
  { value: "D", text: "班 (Squad)", echelonName: "team" },
  { value: "E", text: "排 (Platoon)", echelonName: "squad" },
  { value: "F", text: "連 (Company)", echelonName: "platoon" },
  { value: "G", text: "營 (Battalion)", echelonName: "company" },
  { value: "H", text: "旅 (Regiment/Brigade)", echelonName: "battalion" },
  { value: "I", text: "師 (Division)", echelonName: "regiment" },
  { value: "J", text: "軍 (Corps)", echelonName: "brigade" }
];
```

### SymbolEditor.js Exports

When adding new symbol options, export them from `SymbolEditor.js`:
- `IdentityOptions` - Friend/Hostile/Neutral/Unknown
- `LevelOptions` - Echelon levels with SIDC letters (legacy format)
- `DimensionOptions` - Ground/Air/Sea/Subsurface
- `BranchTypeOptions` - Function IDs (UCI----, UCA----, etc.)
- `StatusModifierOptions` - Status modifiers
- `CommandIndicatorOptions` - Command indicators
- `CommandTypeOptions` - Unit types

**Note:** `SymbolEditorUI.js` uses its own `TestEchelonOptions` and `DimensionFunctionMaps` that match `test.html` format.

## Symbol Library (符號庫)

The symbol library allows users to save commonly used symbols for quick reuse in the organization editor.

### Features

- **Add to Library**: Click "加入符號庫" button in the symbol editor to save the current symbol configuration
- **Persistent Storage**: Symbols are saved to `localStorage` under key `wargame-symbol-library`
- **Drag & Drop**: Drag symbols from the library directly onto organization tree nodes
- **Individual Delete**: Hover over symbol to reveal delete button
- **Clear All**: Use the trash icon in the section header to clear entire library

### Symbol Library Data Structure

```javascript
{
  id: 'lib-symbol-' + Date.now(),
  sidc: 'SFGPUCI----G',
  name: '單位',
  designation: '101',
  higherFormation: '601旅',
  echelon: 'company',
  affiliation: 'F',
  dimension: 'G',
  functionId: 'UCI----',
  createdAt: '2025-01-01T00:00:00.000Z'
}
```

### Symbol Size Configuration

Symbol sizes are controlled by the `size` parameter in milsymbol.js:

| Location | Method | Size | Canvas |
|----------|--------|------|--------|
| Symbol Editor Preview | `_updatePreview()` | 200 | - |
| Symbol Library | `_drawSymbolLibrarySymbols()` | 500 | 300x300 |
| Organization Tree Cards | `_drawSymbols()` | 30 | 20x20 |
| SVG Export | `_copySVG()` | 200 | - |

To adjust symbol library size, modify:
1. `_createSymbolLibraryItem()` - Canvas width/height
2. `_drawSymbolLibrarySymbols()` - `symbolSize` variable
3. `.library-symbol-item` CSS - Container size

### Organization Editor Integration

When dragging symbols from the library to the organization tree:
- The unit **name** uses the `designation` (番號) if available
- The **SIDC code** is not displayed on the card (cleaner UI)
- Both `designation` and `higherFormation` are stored in the unit data

## Three.js Integration

- Canvas element ID: `main-canvas`
- Main app: `frontend/core/App.js`
- Scene management: `frontend/engine/Scene3D.js`

## Import Paths

Use relative imports from project root:
```javascript
import { App } from '../frontend/core/App.js';
import { ORBATService } from '../backend/services/ORBATService.js';
```

## Debugging Access

Global debug object: `window.__WARGAME_APP__` exposes:
- `app` - App instance
- `orbatService` - ORBAT backend service
- `sceneService` - Scene backend service
- `symbolService` - Symbol backend service
- `eventBus` - EventBus instance

## Organization Editor (組織編輯器)

The organization editor is located at `ui/managers/SymbolEditorUI.js` and allows creating and managing hierarchical military organization structures.

### Layout Structure

The organization editor uses a **vertical layout with separated sidebar sections**:

```
┌─────────────────────────────────────────────────────┐
│  [ 符號編輯 ]    [ 組織編輯 ]                         │
├───────────────────────────────────────┬───────────────┐
│  Left: Organization Tree Area        │ 符號來源      │
│  ┌─────────────────────────────────┐ │ (獨立區塊)    │
│  │ 組織名稱: _________________      │ ├───────────────┤
│  ├─────────────────────────────────┤ │ 已儲存組織    │
│  │                                 │ │ (獨立區塊)    │
│  │    組織架構圖                   │ ├───────────────┤
│  │    (層級式樹狀圖)               │ │               │
│  │                                 │ │               │
│  └─────────────────────────────────┘ │               │
│                                       │               │
└───────────────────────────────────────┴───────────────┘
```

### Key CSS Classes

| Class | Description |
|-------|-------------|
| `.org-editor-layout-vertical` | Main container for vertical layout |
| `.org-tree-main` | Left main area for organization tree |
| `.sidebar-section` | Sidebar section (符號來源 / 已儲存組織) |
| `.sidebar-section:first-of-type` | First section (符號來源) positioning |
| `.sidebar-section.org-list-section-compact` | Second section (已儲存組織) positioning |
| `.symbol-library-container` | Symbol library display area |
| `.library-symbol-item` | Individual symbol in library |
| `.org-tree-drop-zone` | Drop zone for organization tree |
| `.org-hierarchy-container` | Container for hierarchical tree view |

### Hierarchical Tree View (層級式組織架構圖)

The organization tree is rendered as a **hierarchical structure with connecting lines** (similar to org chart diagrams):

- Each unit is displayed as a **card** with symbol and name
- **Vertical lines** connect parent to children
- **Horizontal crossbar** connects multiple children
- **Expand/collapse** button (−/+) on cards with children
- **Drag & drop** symbols onto cards to add as child units

### Interactive Features

| Feature | Interaction | Description |
|---------|-------------|-------------|
| **Zoom** | Mouse wheel | Scale 30% ~ 200% |
| **Pan** | Left-click + drag on empty space | Move tree position |
| **Add child unit** | Drag symbol onto unit card | Adds as child of that unit |
| **Add root unit** | Drag symbol onto empty space | **Only if no root exists** |
| **Expand/Collapse** | Click unit card | Toggle children visibility |
| **Edit name** | Click edit button on card | Rename unit |
| **Delete unit** | Click delete button on card | Remove unit |

### Single Root Node Rule

**IMPORTANT:** The organization tree enforces a **single root node** policy:

- ✅ First unit added becomes the root node
- ❌ Cannot add a second root node (drag to empty space when root exists)
- ✅ Can always add child units to existing nodes
- ✅ After deleting root, can add a new root

### Organization Storage

Organizations are saved to `localStorage` under key `wargame-organizations`:

```javascript
// Organization data structure
{
  id: 'org-' + Date.now(),
  name: '組織名稱',
  units: [
    {
      id: 'unit-' + Date.now(),
      sidc: 'SFGPUCI----G',
      name: '單位名稱',
      children: [ /* recursive structure */ ]
    }
  ]
}
```

### Saving Organizations

| Action | Behavior |
|--------|----------|
| **First save** | Creates new organization entry |
| **Save existing** | Prompts: Update OR Save as new |
| **Save as new** | Creates copy with "(副本)" suffix and new ID |
| **Delete** | Removes from storage and creates new blank org |

**Note:** Saving organizations does **NOT** trigger navigation to sandbox (removed `organization:saved` event emission).

### Zoom & Pan Implementation

```javascript
// State properties
this.orgTreeScale = 1;        // Current zoom level
this.orgTreeTranslateX = 0;   // Pan offset X
this.orgTreeTranslateY = 0;   // Pan offset Y

// Transform application
treeContainer.style.transform =
  `translate(${x}px, ${y}px) scale(${scale})`;
```

### Rendering Functions

| Function | Purpose |
|----------|---------|
| `_renderOrgTree()` | Main entry, renders hierarchical tree |
| `_renderHierarchyNode()` | Recursively renders tree nodes with lines |
| `_createUnitCard()` | Creates individual unit card DOM |
| `_drawSymbols()` | Renders NATO symbols on canvases |
| `_renderOrgList()` | Renders saved organizations list |
| `_countAllUnits()` | Recursively counts all units (including children) |


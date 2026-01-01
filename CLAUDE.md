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
| `ui/` | DOM manipulation, UI managers (ORBAT tree, property panels, Symbol editor, Deployment manager, Move mode manager) |
| `js/` | Entry point (`main.js`) - initializes all layers |
| `index.html` | Main HTML page with canvas element |

### Entry Point Flow

`js/main.js` → initializes backend services → creates `App` instance → `App.initialize('main-canvas')` → sets up event listeners

## SIDC Code Format (Critical)

**The system uses 15-character letter format for SIDC codes (NATO APP-6/MIL-STD-2525)**

**Format:**
```
S + Affiliation + Dimension + Status + FunctionID (6 chars) + Echelon
```

Example: `SFGPUCI----F` = 友軍地面現行步兵連

```
Position 1:    S (Standard)
Position 2:    F/H/N/U (Friend/Hostile/Neutral/Unknown)
Position 3:    G/A/S/U (Ground/Air/Sea/Subsurface)
Position 4:    P/A (Present/Anticipated)
Position 5-10: Function ID (e.g., UCI---- = infantry, UCA---- = armor)
Position 15:    Echelon letter (see mapping below)
```

### Echelon Mapping (NATO APP-6/MIL-STD-2525)

**Updated to NATO standard (Position 12 in SIDC):**

| Letter | Display | echelonName (milsymbol) | levelName (ORBAT) | Description |
|--------|---------|------------------------|-------------------|-------------|
| - | - 無 - | "" | "" | No echelon |
| A | 伍/組 (Team) | team | team | Crew/Team |
| B | 班 (Squad) | squad | squad | Squad |
| C | 分排/組 (Section) | section | section | Section |
| D | 排 (Platoon) | platoon | platoon | Platoon |
| E | 連 (Company) | company | company | Company |
| F | 營 (Battalion) | battalion | battalion | Battalion |
| G | 團 (Regiment) | regiment | regiment | Regiment |
| H | 旅 (Brigade) | brigade | brigade | Brigade |
| I | 師 (Division) | division | division | Division |
| J | 軍 (Corps) | corps | corps | Corps |
| K | 軍團 (Army) | army | army | Army |

**Important:** The system maintains two separate echelon name systems:
- **echelonName**: Used by `milsymbol.js` for rendering the echelon marker
- **levelName**: Used by the ORBAT system for displaying Chinese labels

### Common Mistakes

- **Wrong:** Using 20-digit numeric format
- **Wrong:** Using the old D-J echelon mapping
- **Correct:** `SFGPUCI----F` for 連 (echelon `F` at position 15)

## Symbol Generation

Symbols are generated using **milsymbol.js** (loaded via CDN as global `ms` object):

```javascript
// For 3D scene units (deployed on map)
const symbol = new window.ms.Symbol(sidc, {
  size: 100,
  uniqueDesignation: "101",    // 部隊番號
  higherFormation: "601旅",     // 上級單位
  echelon: "company",           // Use echelonName (e.g., "company"), NOT letter code
  infoColor: '#ffffff',         // 文字白色
  infoSize: 20,
  infoPadding: 8
});

// For SVG (used in symbol editor preview)
const symbol = new window.ms.Symbol(sidc, {
  size: 200,
  uniqueDesignation: "101",
  higherFormation: "601旅",
  echelon: "battalion"
});
```

**Deployed Unit Symbol Display:**
- **Fixed size**: 100 (width) × 50 (height)
- **Fixed position**: Y = 100 (distance from ground)
- **Text labels**: `designation` (left) and `higherFormation` (right) in white
- **No unit name label**: Text label below symbol is disabled

Key files:
- `frontend/engine/SymbolEngine.js` - Generates Three.js textures from SIDC with text labels
- `frontend/engine/UnitEngine.js` - Manages 3D unit entities with fixed symbol size, includes `moveUnitToPosition()` method
- `frontend/engine/SymbolEditor.js` - SIDC generation with option exports
- `ui/managers/SymbolEditorUI.js` - Symbol editor UI management
- `ui/managers/PropertyUI.js` - Property panel for unit selection and move controls
- `ui/managers/MoveModeManager.js` - Move mode management with cursor tracking

## Symbol Editor UI

The symbol editor is located at `ui/managers/SymbolEditorUI.js`.

### Control Elements

| Element | ID | Options |
|---------|----|----|
| 陣營 (Affiliation) | `affiliation-select` | F=友軍, H=敵軍, N=中立, U=未知 |
| 戰鬥維度 (Dimension) | `dimension-select` | G=地面, A=空中, S=海上, U=水下 |
| 兵種/功能 (Function) | `function-select` | **Dynamically updates based on dimension** |
| 層級 (Echelon) | `echelon-select` | A-K (伍/組 到 軍團) |
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

## Symbol Library (符號庫)

The symbol library allows users to save commonly used symbols for quick reuse.

### Features

- **Add to Library**: Click "加入符號庫" button to save current symbol configuration
- **Persistent Storage**: Saved to `localStorage` key `wargame-symbol-library`
- **Drag & Drop**: Drag symbols to organization tree nodes
- **Individual Delete**: Hover over symbol to reveal delete button
- **Clear All**: Use trash icon to clear entire library

### Symbol Library Data Structure

```javascript
{
  id: 'lib-symbol-' + Date.now(),
  sidc: 'SFGPUCI----F',
  name: '單位',
  designation: '101',
  higherFormation: '601旅',
  echelon: 'company',        // For milsymbol.js rendering
  level: 'battalion',        // For ORBAT display
  affiliation: 'F',
  dimension: 'G',
  functionId: 'UCI----',
  createdAt: '2025-01-01T00:00:00.000Z'
}
```

## Unit Deployment (單位部署)

The system supports **click-to-deploy** functionality from the ORBAT tree to the 3D map.

### Deployment Manager

Located at `ui/managers/DeploymentManager.js`, handles:
- Deploy mode activation (click on ORBAT unit)
- Custom cursor showing unit symbol
- Map click handling with raycast for position detection
- ESC key to cancel deployment

### Deployment Flow

1. **Click** a unit in ORBAT tree → Enters deploy mode
2. **Mouse cursor** changes to unit symbol
3. **Click on map** → Deploys unit at that position
4. **ESC** → Cancel deployment mode

### Events

| Event | Direction | Purpose |
|-------|----------|---------|
| `ui:enter-deploy-mode` | ORBATUI → EventBus | Triggered when clicking ORBAT unit |
| `ui:exit-deploy-mode` | DeploymentManager → EventBus | Cancel deployment |
| `ui:deploy-unit` | DeploymentManager → main.js | Deploy unit at map position |

## Unit Moving (單位移動)

The system supports **repositioning deployed units** through the property panel.

### Move Mode Manager

Located at `ui/managers/MoveModeManager.js`, handles:
- Move mode activation (click "移動單位" button in property panel)
- Custom cursor showing unit symbol
- Map click handling with raycast for new position
- ESC key to cancel move mode
- Event listener cleanup to prevent memory leaks

### Move Flow

1. **Click** a deployed unit in 3D scene → Unit is selected, property panel shows on right
2. **Click** "移動單位" button in property panel → Enters move mode
3. **Mouse cursor** changes to unit symbol
4. **Click on map** → Unit moves to new position
5. **ESC** → Cancel move mode

### Property Panel Enhancement

Located at `ui/managers/PropertyUI.js`:
- **Unit Selection**: Click 3D unit to show properties (部隊番號, 陣營, 上級單位, SIDC, 位置)
- **Move Button**: "移動單位" button with icon
- **Position Display**: X, Y, Z coordinates (auto-updates after move)
- **Active State**: Button pulses orange when in move mode

### Events

| Event | Direction | Purpose |
|-------|----------|---------|
| `ui:enter-move-mode` | PropertyUI → EventBus | Enter move mode for unit |
| `ui:exit-move-mode` | MoveModeManager → EventBus | Exit move mode |
| `ui:move-unit-mode` | MoveModeManager → EventBus | Notify UI of active move mode |
| `ui:move-unit-to-position` | MoveModeManager → main.js | Move unit to clicked position |
| `ui:get-unit-data` | PropertyUI → main.js | Request unit data for display |

### Unit Engine Methods

Located at `frontend/engine/UnitEngine.js`:

```javascript
// Move unit to new 3D position
unitEngine.moveUnitToPosition(uuid, { x, y, z });
```

This method:
- Updates the 3D group position
- Syncs the unit data
- Emits `backend:unit:updated` event to update UI

## Firepower Configuration (火力配置)

The system supports **firepower range and sector configuration** for deployed units.

### Property Panel Firepower Controls

Located at `ui/managers/PropertyUI.js`, the property panel includes:

- **火力範圍 (Fire Range)**: Number input for range in meters
- **射界左起 (Direction Start)**: Left boundary angle in degrees (0°=North, 90°=East, 180°=South, 270°=West)
- **射界右至 (Direction End)**: Right boundary angle in degrees
- **套用火力設定**: Button to apply the settings

### Firepower Visualization

Located at `frontend/engine/UnitEngine.js`:

```javascript
// Update firepower visualization
entity.updateFirepower({
  range: 100,              // Range in meters
  directionStart: 315,     // Left boundary (NW)
  directionEnd: 45         // Right boundary (NE)
});
```

**Visual Elements:**
- **Red ring**: Shows fire range (radius circle)
- **Orange wedge**: Shows firing sector (direction coverage)

### Unit Data Model

Located at `backend/data/Unit.js`:

```javascript
this.firepower = {
  range: data.fireRange || 0,              // 火力範圍 (公尺)
  directionStart: data.directionStart || 0, // 射界左起 (度數)
  directionEnd: data.directionEnd || 0     // 射界右至 (度數)
};
```

### Events

| Event | Purpose |
|-------|---------|
| `ui:update-firepower` | Update unit firepower settings |

## Unit Move Path (單位移動路徑)

The system supports **move path editing** with Bézier curves and playback animation.

### Architecture

The move path system is split into two components:

**MovePathEngine** (`frontend/engine/MovePathEngine.js`):
- 3D path rendering (Bézier curves using Catmull-Rom)
- Waypoint markers (spheres)
- Animation playback along path
- Path visualization (green in edit mode, gray in read-only mode)

**MovePathUI** (`ui/managers/MovePathUI.js`):
- DOM manipulation and user interaction
- Event emission to Engine layer
- Edit mode activation/deactivation
- Canvas click handling for waypoint placement

### Path Editing Flow

1. **Select unit** → Click unit in 3D scene → Property panel shows on right
2. **Click "編輯路徑"** → Enters path edit mode
   - If animation is playing, stops it and returns unit to path start
   - Saves `originalPosition` (unit's current position)
   - Path first point is set to `originalPosition`
3. **Click on map** → Adds waypoints
4. **Click "播放"** → Animates unit along path (5 seconds)
5. **Click "完成" or ESC** → Exits edit mode
   - Stops playback if active
   - Saves path to backend
   - Unit returns to path start (same as `originalPosition`)
   - Path displays in gray (read-only mode)

### Display Modes

| Mode | Path Color | Waypoint Colors | Description |
|------|-----------|-----------------|-------------|
| Not selected | Hidden | - | Path not visible |
| Selected (read-only) | Gray (0x888888) | All gray | Shows saved path, not editable |
| Edit mode | Green (0x00ff00) | Start: Green, Others: Yellow | Full editing enabled |

### Key Behaviors

**Original Position Tracking:**
- **Entering edit mode**:
  - Calls `stop()` to ensure unit is at path start
  - `originalPosition` = unit's current position (which equals `waypoints[0].position`)
- **During playback**: Unit moves along path from start to end
- **Exiting edit mode**:
  - Calls `stop()` which returns unit to path start (`waypoints[0].position`)
  - Path is saved and displays in gray
  - Unit remains at path start (same as `originalPosition`)

**Path Data Handling:**
- Paths with 1 waypoint: saved as empty array `[]` to backend
- Paths with 2+ waypoints: saved as full array to backend
- On display, empty paths show single marker at unit position

**Playback Behavior:**
- **Playing**: Unit animates from `waypoints[0]` to `waypoints[n]` over 5 seconds
- **Stopped**: Unit immediately returns to `waypoints[0]` (path start)
- **Entering edit while playing**: Animation stops, unit returns to start

### Move Path Data Structure

Located in `backend/data/Unit.js`:

```javascript
this.movePath = data.movePath || []; // Array of waypoints
// Each waypoint: { x, y, z }
```

### Events

| Event | Direction | Purpose |
|-------|----------|---------|
| `ui:enter-move-path-mode` | PropertyUI → EventBus | Enter path editing mode |
| `ui:exit-move-path-mode` | MovePathUI → EventBus | Exit path editing mode |
| `ui:save-move-path-request` | MovePathUI → EventBus | Request path save on exit |
| `ui:play-move-path` | PropertyUI → EventBus | Start path playback |
| `ui:stop-path-playback` | MovePathUI → EventBus | Stop path playback |
| `ui:remove-path-waypoint` | PropertyUI → EventBus | Remove a waypoint |
| `ui:move-path-mode-active` | MovePathEngine → EventBus | Notify UI of active edit mode |
| `ui:move-path-mode-inactive` | MovePathEngine → EventBus | Notify UI of inactive edit mode |
| `ui:load-move-path` | MovePathUI → MovePathEngine | Load path for display/edit |
| `ui:hide-move-path` | MovePathUI → MovePathEngine | Hide path visualization |
| `ui:show-move-path` | PropertyUI → MovePathUI | Show path in read-only mode |
| `ui:clear-move-path` | MovePathUI → MovePathEngine | Clear all waypoints (keep start) |
| `ui:add-path-waypoint-at` | MovePathUI → EventBus | Add waypoint at click position |

**Engine Events:**
| Event | Direction | Purpose |
|-------|----------|---------|
| `engine:path-waypoint-added` | MovePathEngine → EventBus | Notify waypoint added |
| `engine:path-waypoint-removed` | MovePathEngine → EventBus | Notify waypoint removed |
| `engine:path-cleared` | MovePathEngine → EventBus | Notify path cleared |
| `engine:path-playback-start` | MovePathEngine → EventBus | Notify playback started |
| `engine:path-playback-stopped` | MovePathEngine → EventBus | Notify playback stopped |
| `engine:path-playback-complete` | MovePathEngine → EventBus | Notify playback completed |

### Canvas Interaction

**Capture Phase Handling:**
- Uses `{ capture: true }` for priority event handling
- Calls `stopPropagation()` and `preventDefault()` to prevent Scene3D conflicts
- Raycasts against terrain mesh to detect click positions
- Only active when in edit mode

### Animation Playback

Located at `MovePathEngine.play()`:

```javascript
// 5-second animation along Bézier curve
const curve = new THREE.CatmullRomCurve3(waypoints);
const duration = 5000;
const point = curve.getPoint(progress); // progress: 0 to 1
entity.group.position.copy(point);
```

**Stop Behavior:**
Located at `MovePathEngine.stop()`:

```javascript
// Immediately returns unit to path start
if (this.currentUnit && this.waypoints.length > 0) {
  const startPoint = this.waypoints[0].position;
  this.moveUnitToPosition(startPoint);
}
```

## Three.js Integration

- Canvas element ID: `main-canvas`
- Main app: `frontend/core/App.js`
- Scene management: `frontend/engine/Scene3D.js`
- Terrain: `app.terrainEngine.terrain` (mesh for raycasting)

### Visual Settings

**Connection Lines:**
- Color: Green (`0x00ff88`) with glowing effect
- Opacity: 0.9 (unselected), 1.0 (selected)
- Connects 3D model to floating unit symbol

**Deployed Unit Symbols:**
- Fixed size: 100 × 50 (width × height)
- Fixed position: Y = 100 (above ground)
- Text labels: designation (left), higherFormation (right) in white

### GUI Control Panel

Located at `frontend/engine/GUIManager.js`, provides adjustable settings:

**符號設置 (Symbol Settings):**
| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| 符號寬度 | 10-200 | 100 | Symbol width (X-axis) |
| 符號高度 | 10-200 | 50 | Symbol height (Y-axis) |
| 符號位置Y | 5-200 | 100 | Distance from ground |
| 顯示連接線 | toggle | true | Show connection lines |
| 連接線透明度 | 0-1 | 0.6 | Line opacity |

**Note:** GUI adjustments override LOD-based symbol sizing. Once adjusted via GUI, LOD no longer affects symbol size.

## Organization Editor (組織編輯器)

The organization editor is in `ui/managers/SymbolEditorUI.js` (organization panel).

### Key Features

- **Hierarchical tree view** with connecting lines
- **Drag & drop** symbols from library to tree
- **Zoom & pan** (mouse wheel, drag on empty space)
- **Auto-save** to localStorage (`wargame-organizations`)
- **Folder display** in ORBAT tree (sandbox mode)

### Organization Data Structure

```javascript
{
  id: 'org-' + Date.now(),
  name: '組織名稱',
  units: [
    {
      id: 'unit-' + Date.now(),
      sidc: 'SFGPUCI----F',
      name: '單位名稱',  // Uses designation (番號)
      level: 'battalion',
      designation: '101',
      higherFormation: '601旅',
      children: [ /* recursive */ ]
    }
  ]
}
```

### ORBAT Tree Display

When organizations are loaded in the sandbox, they display as:
- **Folder** with organization name and unit count
- **Hierarchical unit tree** inside folder
- **Level badges** showing 中文 (營, 連, 排, etc.)

## Debugging Access

Global debug object: `window.__WARGAME_APP__` exposes:
- `app` - App instance
- `orbatService` - ORBAT backend service
- `sceneService` - Scene backend service
- `symbolService` - Symbol backend service
- `eventBus` - EventBus instance

## Event Reference

All events are defined in `frontend/core/EventBus.js`:

```javascript
// Move Mode Events
UI_ENTER_MOVE_MODE: 'ui:enter-move-mode'
UI_EXIT_MOVE_MODE: 'ui:exit-move-mode'
UI_MOVE_UNIT_MODE: 'ui:move-unit-mode'
UI_MOVE_UNIT_TO_POSITION: 'ui:move-unit-to-position'
UI_GET_UNIT_DATA: 'ui:get-unit-data'

// Firepower Events
UI_UPDATE_FIREPOWER: 'ui:update-firepower'

// Move Path Events
UI_ENTER_MOVE_PATH_MODE: 'ui:enter-move-path-mode'
UI_EXIT_MOVE_PATH_MODE: 'ui:exit-move-path-mode'
UI_PLAY_MOVE_PATH: 'ui:play-move-path'
UI_STOP_PATH_PLAYBACK: 'ui:stop-path-playback'
UI_SAVE_MOVE_PATH_REQUEST: 'ui:save-move-path-request'
UI_REMOVE_PATH_WAYPOINT: 'ui:remove-path-waypoint'
UI_MOVE_PATH_MODE_ACTIVE: 'ui:move-path-mode-active'
UI_MOVE_PATH_MODE_INACTIVE: 'ui:move-path-mode-inactive'
UI_LOAD_MOVE_PATH: 'ui:load-move-path'
UI_HIDE_MOVE_PATH: 'ui:hide-move-path'
UI_SHOW_MOVE_PATH: 'ui:show-move-path'
UI_CLEAR_MOVE_PATH: 'ui:clear-move-path'
UI_ADD_PATH_WAYPOINT_AT: 'ui:add-path-waypoint-at'

// Move Path Engine Events
ENGINE_PATH_WAYPOINT_ADDED: 'engine:path-waypoint-added'
ENGINE_PATH_WAYPOINT_REMOVED: 'engine:path-waypoint-removed'
ENGINE_PATH_CLEARED: 'engine:path-cleared'
ENGINE_PATH_PLAYBACK_START: 'engine:path-playback-start'
ENGINE_PATH_PLAYBACK_STOPPED: 'engine:path-playback-stopped'
ENGINE_PATH_PLAYBACK_COMPLETE: 'engine:path-playback-complete'
```

## Important Notes

- **No sample units** are added on startup (disabled in `main.js`)
- ORBAT tree shows **only** organizations created in organization editor
- **Unit name** in ORBAT uses `designation` (番號) if available
- **SIDC display** on cards has been removed for cleaner UI
- **Deployed units** display text labels (designation/higherFormation) on the symbol itself
- **Unit name labels** below symbols are disabled (not shown in 3D scene)
- **Symbol size is fixed** at 100×50 for all deployed units (can be adjusted via GUI)
- **Unit selection**: Click 3D unit to select and show property panel
- **Move mode**: Prevents Scene3D click handling via `stopPropagation()` on canvas events
- **Event cleanup**: MoveModeManager properly removes event listeners to prevent memory leaks
- **Move path original position**: When entering/exiting path edit mode, units are always at the path start position (waypoints[0]), which is saved as `originalPosition`
- **Move path playback**: When stopping playback (or exiting edit mode during playback), units immediately return to path start
- **Move path enter-while-playing**: If entering edit mode while animation is playing, playback stops and unit returns to start first
- **Path data handling**: Paths with 1 waypoint are saved as empty array `[]`; paths with 2+ waypoints are saved fully
- **Path visualization**: Paths show in gray (read-only) when unit is selected, and in green/yellow (edit mode) when editing
- **Firepower visualization**: Red ring shows range, orange wedge shows firing sector (directionStart to directionEnd)

## CSS Styles

Move mode and move path related styles in `css/styles.css`:

```css
/* Move cursor following mouse */
.move-cursor {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.9;
}

/* Mode hint at bottom */
.mode-hint {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}

/* Path edit hint */
.path-edit-hint {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 10001;
}

/* Move button styles */
.action-btn.move-btn {
  /* Button with hover and active states */
}

.action-btn.move-btn.active {
  background: #f39c12;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Path button styles */
.action-btn.path-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.action-btn.path-btn.play-btn {
  background: rgba(46, 204, 113, 0.2);
  border-color: #27ae60;
  color: #27ae60;
}

.action-btn.path-btn.active {
  background: #3498db;
  color: white;
}

/* Waypoint list */
.path-waypoints-list {
  display: block;
}

.waypoint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.waypoint-remove-btn {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 16px;
}

/* Direction reference */
.direction-reference {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
}
```

---

## Module Reference

Complete list of all modules in the codebase and their purposes.

### Backend Layer (`backend/`)

#### Data Models (`backend/data/`)

| File | Purpose |
|------|---------|
| `Unit.js` | Unit data model: UUID, name, SIDC, position, level, parent-child relationships, firepower (range, directionStart, directionEnd), movePath (array of waypoints) |
| `Scene.js` | Scene data model: units list, tactical graphics, time settings |
| `TacticalGraphic.js` | Tactical graphic model (operational lines, target areas, etc.) |
| `Enums.js` | Enum definitions: Identity (Friend/Hostile/Neutral/Unknown), LODLevel |

#### Business Services (`backend/services/`)

| File | Purpose |
|------|---------|
| `ORBATService.js` | ORBAT management: CRUD operations, tree structure, hierarchy relationships, statistics |
| `SceneService.js` | Scene management: load/save scenes, time control, playback/pause, import/export JSON |
| `SymbolService.js` | SIDC parsing, color mapping, symbol validation, metadata extraction |

#### Data Access (`backend/repositories/`)

| File | Purpose |
|------|---------|
| `LocalStorage.js` | LocalStorage persistence |
| `MemoryStorage.js` | In-memory temporary storage |

### Frontend Layer (`frontend/`)

#### Core (`frontend/core/`)

| File | Purpose |
|------|---------|
| `App.js` | Main application class: coordinates 3-layer architecture, initializes all engines, sets up event handlers |
| `Config.js` | Global configuration: camera, lighting, grid, LOD, unit defaults |
| `EventBus.js` | Event bus for inter-layer communication (publish-subscribe pattern) |

#### Engines (`frontend/engine/`)

| File | Purpose |
|------|---------|
| `Scene3D.js` | Three.js scene management: camera, renderer, lights, grid, orbit controls, raycasting for click detection |
| `TerrainEngine.js` | Terrain generation and management |
| `SymbolEngine.js` | Military symbol generation using milsymbol.js: creates Three.js textures/Sprites with text labels |
| `UnitEngine.js` | Unit 3D entity management: models, symbols, connection lines, LOD, selection state, `moveUnitToPosition()` method, firepower visualization (red range ring, orange firing sector) |
| `MovePathEngine.js` | Move path rendering: Bézier curves (Catmull-Rom), waypoint markers (spheres), animation playback, path visualization (green=edit, gray=read-only), `stop()` returns unit to path start |
| `TacticalEngine.js` | Tactical graphic rendering (lines, areas, markers) |
| `GUIManager.js` | dat.GUI floating control panel (symbol size, opacity, grid toggle, camera distance) |
| `SymbolEditor.js` | SIDC generation logic and option mappings (Identity, Dimension, Branch, Level) |

#### Utilities (`frontend/utils/`)

| File | Purpose |
|------|---------|
| `Coordinate.js` | Coordinate conversion utilities |
| `Math3D.js` | 3D math helper functions |
| `UUID.js` | UUID generator |

### UI Layer (`ui/`)

#### Main Manager (`ui/`)

| File | Purpose |
|------|---------|
| `UIManager.js` | UI coordinator: initializes all UI managers, forwards events between layers |

#### Managers (`ui/managers/`)

| File | Purpose |
|------|---------|
| `ORBATUI.js` | ORBAT tree widget: renders unit nodes, drag-drop reordering, context menu, deploy mode entry point |
| `PropertyUI.js` | Property panel: displays selected unit info (designation, affiliation, SIDC, position, firepower with red/orange visualization), move button, move path controls (edit, play, waypoint list) |
| `SymbolEditorUI.js` | **Dual-panel editor**:<br>• Symbol Editor: affiliation/dimension/function/echelon selectors, live preview, copy SIDC/SVG, add to library<br>• Organization Editor: hierarchical tree with drag-drop symbols, save/load organizations, symbol library management |
| `ToolbarUI.js` | Main toolbar buttons |
| `TimelineUI.js` | Timeline slider and controls |
| `DeploymentManager.js` | Deploy mode: click ORBAT unit → custom cursor → click map to deploy, ESC to cancel |
| `MoveModeManager.js` | Move mode: click move button → custom cursor → click map to reposition, ESC to cancel, proper event cleanup |
| `MovePathUI.js` | Move path UI: edit mode activation/deactivation, canvas click handling for waypoints, hint display, emits events to MovePathEngine, `stop()` on deactivate, saves `originalPosition` |

### Entry Point

| File | Purpose |
|------|---------|
| `js/main.js` | Application entry point: initializes backend services, creates App instance, sets up event listeners |
| `index.html` | Main HTML with `<canvas id="main-canvas">` element |
| `css/styles.css` | Global styles including move cursor, mode hints, button states |

### External Libraries

| Library | Purpose |
|---------|---------|
| `milsymbol.js` | NATO APP-6/MIL-STD-2525 military symbol generation (global `ms` object) |
| `Three.js` | 3D rendering engine |
| `dat.gui` | Floating control panel library |


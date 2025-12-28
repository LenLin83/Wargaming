# Wargaming - Military Wargame Sandbox System

![License](https://img.shields.io/badge/license-Educational%20Use-blue)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey)

A professional military simulation and decision support tool providing visualized, standardized 3D wargame sandbox for tactical operations.

## Features

- **Symbol Editor**: Create military symbols following APP-6/MIL-STD-2525 standards
- **Symbol Library**: Save and reuse commonly used symbols
- **Organization Editor**: Hierarchical tree view for managing ORBAT (Order of Battle)
- **3D Sandbox**: Three.js-powered terrain and unit visualization
- **Drag & Drop**: Intuitive deployment from ORBAT tree to 3D map
- **Persistent Storage**: LocalStorage-based data persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript + Three.js |
| **3D Engine** | Three.js |
| **Symbol Generation** | milsymbol.js |
| **State Management** | EventBus Pattern |
| **Storage** | LocalStorage API |
| **Build Tool** | Vite |

## Architecture

The system follows a **three-layer architecture**:

```
UI Layer (ui/) → Frontend Layer (frontend/) → Backend Layer (backend/)
```

All inter-layer communication uses the **EventBus** pattern for loose coupling.

### Project Structure

```
Wargaming/
├── backend/              # Data models & business services
│   ├── data/            # Enums, Scene, Unit, TacticalGraphic
│   ├── repositories/    # LocalStorage, MemoryStorage
│   └── services/        # ORBAT, Scene, Symbol services
├── frontend/            # 3D engine & core logic
│   ├── core/            # App, Config, EventBus
│   ├── engine/          # Symbol, Scene, Terrain, Unit engines
│   └── utils/           # Coordinate, Math3D, UUID utilities
├── ui/                  # DOM manipulation & UI managers
│   └── managers/        # ORBAT, Property, Symbol Editor UIs
├── css/                 # Stylesheets
├── docs/                # Documentation
├── js/                  # Entry point (main.js)
└── index.html           # Main HTML page
```

## SIDC Code Format

The system uses **15-character letter format** for SIDC codes (APP-6/MIL-STD-2525):

```
S + Affiliation + Dimension + Status + FunctionID (6 chars) + Echelon
```

Example: `SFGPUCI----G` = 友軍地面現行步兵營

```
Position 1:    S (Standard)
Position 2:    F/H/N/U (Friend/Hostile/Neutral/Unknown)
Position 3:    G/A/S/U (Ground/Air/Sea/Subsurface)
Position 4:    P/A (Present/Anticipated)
Position 5-10: Function ID (e.g., UCI---- = infantry)
Position 11-16: Echelon letter (D=班, E=排, F=連, G=營, H=旅, I=師, J=軍)
```

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (runs on http://localhost:3000)
npm run dev
```

### Build

```bash
# Create production build
npm run build
```

## Usage

### Symbol Editor

1. Select **Affiliation** (陣營): Friend/Hostile/Neutral/Unknown
2. Select **Dimension** (戰鬥維度): Ground/Air/Sea/Subsurface
3. Select **Function** (兵種): Dynamically updates based on dimension
4. Select **Echelon** (層級): Squad to Corps level
5. Enter **Designation** (部隊番号) and **Higher Formation** (上級單位)
6. Click **「加入符號庫」** to save for reuse

### Organization Editor

1. Enter organization name
2. Drag symbols from **符號來源** (Symbol Source) to the organization tree
3. First symbol becomes the root node
4. Drag onto existing units to add as children
5. Click **Save** to persist organization

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Developer guide for Claude Code
- [docs/00-專案企劃書.md](./docs/00-專案企劃書.md) - Project proposal
- [docs/01-資料結構規格.md](./docs/01-資料結構規格.md) - Data structure specification
- [docs/02-技術架構.md](./docs/02-技術架構.md) - Technical architecture

## Contributing

This project is for educational and research purposes.

## License

Educational Use Only

## Author

**LenLin83**

---

Built with ❤️ using Three.js and milsymbol.js

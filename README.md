# ZenShikaku (四角に切れ)

> **Calm, meditative Japanese Shikaku (Divide by Rectangles) tatami room logic puzzle with procedural acoustics.**

[![CI](https://github.com/OfferPk/zenshikaku/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenshikaku/actions/workflows/pages.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/pages.yml)
[![Android](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎮 Play Live
- **Web App / PWA**: [https://offerpk.github.io/zenshikaku/](https://offerpk.github.io/zenshikaku/)
- **Android APK**: Download `zenshikaku-apk` from [GitHub Actions Artifacts](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml) or latest [Releases](https://github.com/OfferPk/zenshikaku/releases).

---

## 📸 Screenshots

| Floorplan Grid & Tiling | Tatami Rooms & Dimensions | Temple Floorplans |
|:---:|:---:|:---:|
| *(Screenshots captured during live demo & APK tests)* | *(Interactive live W × H preview)* | *(50 levels across 5 difficulty packs)* |

---

## 🌸 About the Game

ZenShikaku is inspired by the classic Japanese pencil-and-paper puzzle **Shikaku** (四角に切れ / *Shikaku ni kire*, meaning "divide into squares/rectangles"), popularized by Nikoli.

You partition peaceful Japanese wooden floorplans into rectangular tatami rooms such that:
1. **Rectangular Rooms**: Every room is an orthogonal rectangle or square.
2. **One Number per Room**: Each room contains exactly one number clue inside its boundaries.
3. **Area Equals Clue**: The room's total area (Width × Height) in grid cells matches that number.
4. **Complete Coverage**: The entire floorplan is tiled without gaps or overlaps.

---

## ✨ Features

- **50 Handcrafted Levels**: 5 difficulty tiers (Tea Garden 5×5, Shoji Pavilion 6×6, Tatami Courtyard 7×7, Bamboo Sanctuary 8×8, Imperial Temple 9×9).
- **100% Unique Solutions**: All 50 levels verified by an exhaustive constraint backtracking solver.
- **Procedural Japanese Web Audio**:
  - Soft sliding screen swish (*shoji*) on drag.
  - Tactile tatami mat placement thuds.
  - Crisp bamboo clacks (*shishi-odoshi*) when a clue is satisfied.
  - Resonant Japanese Buddhist temple victory gong (*Bonshō* 梵鐘) on puzzle completion.
- **Fluid Controls**:
  - Drag from corner to corner to draw rooms.
  - Or tap one corner, then tap the opposite corner.
  - Tap any existing room to remove it.
  - Live dimension badge (`W × H = Area`) with real-time clue matching feedback.
- **Deductive Hint Engine**: Step-by-step logic deductions (prime factors, corner bounds, and reachability).
- **Unlimited Undo & Reset**: Experiment freely with full state history.
- **Offline & Private**: Built as a zero-dependency Progressive Web App (PWA) with Service Worker and Capacitor Android packaging. Zero ads, zero trackers, no permissions needed.

---

## 🛠️ Development & Build

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Run Locally
```bash
# Clone the repository
git clone https://github.com/OfferPk/zenshikaku.git
cd zenshikaku

# Run unit tests
npm test

# Build static assets to www/
npm run build
```

To run a local web server:
```bash
npx serve www
```

### Android APK Build
The project uses Capacitor to package the web assets into a native Android application:
```bash
# Add or sync Android platform
npx cap add android
npx cap sync android

# Build debug APK via Gradle
cd android
./gradlew assembleDebug
```
The resulting debug APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

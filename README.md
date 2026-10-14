# ZenShikaku: Tatami Room Logic (四角に切れ)

> A serene, meditative Japanese grid-partitioning logic puzzle. Divide tea house and temple floorplans into rectangular tatami rooms matching number clue areas.

[![CI](https://github.com/OfferPk/zenshikaku/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenshikaku/actions/workflows/pages.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/pages.yml)
[![Android](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🍵 Live Web Demo & Android APK
- **Play Online**: [https://offerpk.github.io/zenshikaku/](https://offerpk.github.io/zenshikaku/)
- **Android APK**: Download debug APK from [GitHub Actions Artifacts](https://github.com/OfferPk/zenshikaku/actions/workflows/android.yml) (`zenshikaku-apk`).

---

## 🪟 The Rules of Shikaku (四角に切れ)
1. **Room Partitioning**: Divide the entire grid floorplan into non-overlapping rectangular and square tatami rooms.
2. **Single Clue per Room**: Every room must enclose exactly one number clue.
3. **Exact Area**: The area (width × height) of each room must equal the number clue inside it.
4. **Complete Coverage**: Every cell on the grid must be covered by a room with no empty gaps and no overlaps.
5. **Pure Logic**: Every puzzle is handcrafted and 100% solver-verified with a unique solution.

---

## ✨ Features
- **50 Handcrafted Levels across 5 Packs**:
  - Pack 1: Tea Garden (5×5)
  - Pack 2: Shoji Pavilion (6×6)
  - Pack 3: Tatami Courtyard (7×7)
  - Pack 4: Bamboo Sanctuary (8×8)
  - Pack 5: Imperial Temple (9×9)
- **Procedural Japanese Acoustics**: Pure Web Audio synthesizer with soft shoji sliding whooshes, resonant tatami mat placement thuds, bamboo clacks, and resonant temple victory bells.
- **Intuitive Touch & Drag Controls**: Smooth corner-to-corner dragging with live dimension preview badge (`W × H = Area`) and two-tap mode support.
- **Deductive Hint Engine**: Smart analysis detecting forced dimensions, corner restrictions, and orphaned cells.
- **Offline PWA & Capacitor Android**: Complete offline standalone gameplay with service worker caching.

---

## 🛠️ Development & Build

### Prerequisites
- Node.js 20+

### Testing Logic
```bash
npm test
```

### Building Web Assets
```bash
npm run build
```

### Capacitor Android Sync
```bash
npx cap add android
npx cap sync android
```

---

## 📄 License & Store Listing
- Distributed under the [MIT License](LICENSE).
- Play Store listing metadata and privacy declaration located in [PLAY_LISTING.md](PLAY_LISTING.md).

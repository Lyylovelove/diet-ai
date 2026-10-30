# Changelog

All notable changes to **DietAI** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/).

---

## [v17.1] - 2026-10-30 (Marvel Special Edition · 漫威特别版)

### Added
- **Stark Tech HUD Theme (`data-theme="marvel"`)**: Introduced the **Marvel 17.1 Special Edition** UI theme featuring Iron Man Mark LXXXV Crimson & Titanium Gold armor cards, tactical coordinate grid background, and `STARK BIOMETRICS · MARK LXXXV` telemetry header.
- **Arc Reactor Calorie Core**: Added a 3-stop gradient (`#FF2A36` → `#FBBF24` → `#00F0FF`) and segmented inner Arc Reactor coil ring (`ring-arc-inner`) to the central calorie gauge.
- **4-Mode Theme Switcher**: Expanded the top-bar quick toggle and Settings selector to cycle seamlessly between `漫威版 (Marvel)`, `随系统 (System)`, `浅色 (Light)`, and `深色 (Dark)`.

---

## [v1.0.17] - 2026-10-30

### Fixed
- **Launcher Icon Visibility**: Fixed `<category android:name="android.intent.category.LAUNCHER" />` in `AndroidManifest.xml` so the app icon and system installer "Open" action work seamlessly across Samsung One UI and Android 14 launchers.

---

## [v1.0.16] - 2026-10-30

### Changed
- **Full-Page Settings Navigation**: Replaced the modal settings overlay (`#modal-settings`) with a dedicated 3rd bottom-navigation tab page (`#tab-settings`).
- **Streamlined Home Header**: Removed the redundant top-right gear button from the home header, keeping only the quick theme mode switcher.

---

## [v1.0.15] - 2026-10-29

### Added
- **Adaptive System Dark / Light Theme**: Added native `Configuration.UI_MODE_NIGHT_MASK` listener in `MainActivity.java` and `AndroidTheme` JS bridge to synchronize system status/navigation bars and WebView theme (`Obsidian Dark` & `Alabaster Light`) automatically with phone system settings.
- **Quick Theme Switcher**: Added a top-bar pill toggle cycling between `跟随系统 (System)`, `浅色 (Light)`, and `深色 (Dark)`.

---

## [v1.0.14] - 2026-10-29

### Fixed
- **JSON Truncation Auto-Repair**: Implemented a finite-state-machine JSON parser (`parseAndRepairJson`) to automatically close truncated strings, arrays, and objects when multi-item food recognition responses exceed token limits.
- **Tuple Food DB Lookup**: Fixed array index resolution for `[name, kcal, p, c, f]` tuples in `fooddb.js`.

### Changed
- **Obsidian Bento UI Overhaul**: Redesigned the calorie cockpit into a symmetric 3-column layout (`已摄入 | 剩余预算圆环 | 目标预算`), replaced system emojis with custom vector SVGs, and introduced a floating frosted-glass bottom navigation pill.

---

## [v1.0.13] - 2026-10-29

### Added
- **Unified Multimodal Composer**: Combined photo staging (camera/gallery) and supplementary text description into a single unified input dock.
- **Zero-Latency Direct Macro Parser**: Added instant local regex recognition (`tryParseDirectNutrientInput`) for pure macros (`纯蛋白质30g`), protein powder scoops (`1勺蛋白粉`), and common weighed foods (`鸡胸肉150g + 鸡蛋2个`).
- **Atwater Energy Conservation Reconciler**: Enforced `kcal = 4P + 4C + 9F` consistency across all ingredients and meal totals, with inline gram editing (`updateIngGrams`) and automatic filtering of hallucinated cooking oil (`shouldFilterHallucinatedOil`).
- **Historical Date Switcher & JSON Backup**: Added date navigation bar for viewing/backfilling past days, manual quick entry modal, and one-click JSON backup export/restore.
- **Persistent Signing Keystore**: Configured fixed signing key (`app/dietai-release.jks`) so all future APK releases upgrade in-place without losing user data.

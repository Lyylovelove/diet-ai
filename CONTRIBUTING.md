# Contributing to DietAI

感谢你对 **DietAI** 开源项目的关注与贡献！

## 开发流程

1. **Fork 本仓库** 并克隆到本地：
   ```bash
   git clone https://github.com/<your-username>/diet-ai.git
   cd diet-ai
   ```
2. **创建特性分支**：
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **代码规范**：
   - **Android 原生层 (`app/src/main/java/`)**：保持对 Android 7.0+ (`minSdk 24`) 至 Android 14 (`targetSdk 34`) 的向后兼容。
   - **前端视图与算法层 (`app/src/main/assets/`)**：
     - 保持零外部框架依赖（Vanilla ES5/ES6+），确保在 Samsung One UI 及主流 Android System WebView 中以 60fps 运行。
     - 所有新增样式需同时兼容深色模式（默认 `:root`）与浅色模式（`html[data-theme="light"]`）。
     - 任何营养素计算逻辑修改必须通过 **Atwater 能量守恒校验**（`kcal = 4P + 4C + 9F`）。
     - 提交前请使用 `node --check app/src/main/assets/app.js` 校验语法。
4. **提交 Pull Request**：
   - 请使用清晰的 Commit Message（遵循 Conventional Commits 规范，如 `feat:`, `fix:`, `docs:`, `refactor:`）。

# Deployment

本项目使用 GitHub Pages 发布静态构建产物。

## GitHub Pages

预期地址：

```text
https://he-lab2024.github.io/schedule-visualization-app/
```

发布流程位于 `.github/workflows/pages.yml`：

1. Checkout 仓库。
2. 安装依赖。
3. 运行 `npm run test:run`。
4. 配置 GitHub Pages。
5. 运行 `npm run build:pages`。
6. 上传并部署 `dist/`。

## 首次启用

如果访问地址返回 404，请在 GitHub 仓库设置中确认：

1. 进入 `Settings -> Pages`。
2. 将 Source 设置为 `GitHub Actions`。
3. 回到 `Actions` 页确认 `Deploy GitHub Pages` workflow 已成功完成。

## 本地验证

```bash
npm run test:run
npm run build:pages
```

本机 npm shim 不可用时：

```bash
node "D:\Download\Node\node_modules\npm\bin\npm-cli.js" run test:run
node "D:\Download\Node\node_modules\npm\bin\npm-cli.js" run build:pages
```

`build:pages` 会使用 `/schedule-visualization-app/` 作为 Vite base，适配 GitHub Pages 的仓库子路径。

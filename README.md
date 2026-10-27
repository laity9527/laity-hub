# Laity

Laity 独立开发厂牌主站（https://laity.work）。单页官网，纯 Astro 与原生 CSS，部署在 Cloudflare Pages。

- `src/pages/index.astro`：首页（Hero、数据、产品列表、方法论），产品数据来自 `src/data/projects.json`
- `src/lib/tracks.ts`：构建时拉取前后志 RSS，失败时降级为占位文案
- `src/layouts/BaseLayout.astro`：全站骨架、设计变量与 SEO 元信息
- `src/components/Footer.astro`：页脚与品牌水印

前后志子站是独立仓库，其 RSS 输出在 https://build.laity.work/rss.xml。

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 本地开发（默认 4321 端口） |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览构建产物 |

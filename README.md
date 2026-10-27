# Laity

Laity 独立开发厂牌主站（https://laity.work）。纯 Astro 与原生 CSS 的静态站，部署在 Cloudflare Pages。前后志子站是独立仓库，部署在 https://build.laity.work。

## 结构

- `src/pages/index.astro`：首页（Hero、数据、产品列表、方法论），产品数据来自 `src/data/projects.json`
- `src/pages/about.astro`：关于页（立场、轨迹、Now、前后志入口）
- `src/pages/404.astro`：未找到页，`noindex`
- `src/pages/sitemap.xml.ts`：构建期生成 `/sitemap.xml`，零依赖，只枚举静态页
- `src/layouts/BaseLayout.astro`：全站骨架、设计变量、SEO/分享元信息、图标与 PWA 清单引用
- `src/components/Footer.astro`：页脚与品牌水印
- `public/robots.txt`：抓取规则与 sitemap 声明
- `public/_headers`：Cloudflare Pages 的响应头（安全头 + `/_astro/*` 长缓存）
- `public/manifest.webmanifest`、`icon-192.png`、`icon-512.png`、`mask-icon.svg`、`apple-touch-icon.png`、`favicon.*`：PWA 与各家图标
- `public/og/og-default.png`：1200×630 社交分享图

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 本地开发（默认 4321 端口） |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览构建产物 |

## 部署

推送到 `main` 后由 Cloudflare Pages 自动构建。`astro.config.mjs` 里的 `site` 决定 canonical 与 `og:url`，改成别的域名时 `public/robots.txt` 里的 sitemap 地址要一起改。`_headers` 只在 Pages 上生效，本地 `preview` 不会应用。

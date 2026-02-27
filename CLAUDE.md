# Project: Literature Matrix

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- Zustand (state), SWR, OpenAI SDK
- Nacos 配置中心（通过 instrumentation.ts 启动时拉取，覆盖本地环境变量）
- Docker + Nginx + Supervisord (production)

## Dev Environment

开发环境使用 `docker-compose.dev.yml`（端口 9991），将项目目录挂载到容器内，通过 `npm run dev` 热更新：

```bash
sudo docker compose -f docker-compose.dev.yml up -d
```

**禁止每次代码修改都重新 build 镜像。** 仅在 package.json 依赖变更时才需要重新 build dev 镜像。

修改 `.env.local` 后需要重建容器（`down` 再 `up`），`restart` 不会重新读取 env_file。

## Production Build

```bash
sudo docker compose build && sudo docker compose up -d
```

## Project Structure

```
app/           # Next.js App Router (pages + API routes)
  api/env/     # 环境变量检查接口（返回 ENVIRONMENT）
components/    # React components
  LanguageToggle.tsx  # 中英文切换按钮
hooks/         # Custom hooks
i18n/          # 国际化（类型安全的消息字典 + useT() hook）
  types.ts     # Locale 类型 + Messages 接口
  en.ts        # 英文翻译
  zh.ts        # 中文翻译
  index.ts     # useT() hook（返回 t(key, params?) 翻译函数）
lib/           # Utilities & server modules (nacos.ts, config.ts, etc.)
stores/        # Zustand stores
  useLocaleStore.ts  # 语言状态（localStorage 持久化 + hydration 安全）
types/         # TypeScript types
```

## Key Patterns

- `lib/server/config.ts` — lazy getters 读取 process.env，Nacos 注入后自动生效
- `instrumentation.ts` — 服务启动时从 Nacos 拉取配置注入 process.env
- 配置优先级：Nacos > .env.local > 代码默认值（Nacos 会覆盖已有值）
- `i18n/` — 零依赖国际化，TS 编译器确保中英文字典 key 完整一致
- `useLocaleStore` — SSR 初始为 `'en'`，hydration 后从 localStorage/浏览器语言检测，避免 hydration mismatch
- `useLocaleHydration()` — 必须在顶层组件（page.tsx）调用一次

## Nacos 配置

环境变量在 `.env.local` 中配置：

```
NACOS_SERVER_ADDR=http://mse-xxx-nacos-ans.mse.aliyuncs.com
NACOS_NAMESPACE=<namespace-uuid>   # 注意：必须用 UUID，不是名称
NACOS_DATA_ID=.env
NACOS_GROUP=table-search
```

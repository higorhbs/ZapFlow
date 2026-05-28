FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/firebase/package.json packages/firebase/
COPY packages/shared/package.json packages/shared/
COPY packages/whatsapp-client/package.json packages/whatsapp-client/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api
COPY packages/firebase packages/firebase
COPY packages/shared packages/shared
COPY packages/whatsapp-client packages/whatsapp-client
RUN pnpm --filter @zapflow/firebase build \
  && pnpm --filter @zapflow/shared build \
  && pnpm --filter @zapflow/whatsapp-client build \
  && pnpm --filter @zapflow/api build

FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/firebase/package.json packages/firebase/
COPY packages/shared/package.json packages/shared/
COPY packages/whatsapp-client/package.json packages/whatsapp-client/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm store prune

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/firebase/dist packages/firebase/dist
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/whatsapp-client/dist packages/whatsapp-client/dist

RUN mkdir -p /app/sessions && chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

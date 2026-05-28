FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY packages/firebase/package*.json packages/firebase/
COPY packages/shared/package*.json packages/shared/
COPY packages/whatsapp-client/package*.json packages/whatsapp-client/

RUN npm ci

COPY apps/api apps/api
COPY packages/firebase packages/firebase
COPY packages/shared packages/shared
COPY packages/whatsapp-client packages/whatsapp-client
RUN npm run build --workspace @zapflow/firebase \
  && npm run build --workspace @zapflow/shared \
  && npm run build --workspace @zapflow/whatsapp-client \
  && npm run build --workspace @zapflow/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY packages/firebase/package*.json packages/firebase/
COPY packages/shared/package*.json packages/shared/
COPY packages/whatsapp-client/package*.json packages/whatsapp-client/

RUN npm ci --omit=dev --workspaces --include-workspace-root --ignore-scripts && npm cache clean --force

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/firebase/dist packages/firebase/dist
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/whatsapp-client/dist packages/whatsapp-client/dist

RUN mkdir -p /app/sessions && chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

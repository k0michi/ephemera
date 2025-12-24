FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

FROM base AS dev-deps
RUN npm ci

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM dev-deps AS builder
WORKDIR /app

COPY shared ./shared
COPY frontend ./frontend

RUN npm run build -w frontend

FROM node:20-alpine AS runner
ENV NODE_ENV=production

WORKDIR /app

COPY --from=prod-deps /app/node_modules /app/node_modules

COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/frontend/build ./build

CMD ["npm", "run", "start", "-w", "frontend"]
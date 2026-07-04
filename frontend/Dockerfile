FROM node:24-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN npm ci
COPY .git ./.git
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build -w frontend

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev
COPY --from=builder /app/frontend/build ./frontend/build
CMD ["npm", "run", "start", "-w", "frontend"]
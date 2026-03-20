FROM node:20-alpine AS builder
WORKDIR /app
COPY .git ./.git
COPY package.json package-lock.json ./
COPY shared/. ./shared/
COPY backend/package.json ./backend/
RUN npm ci
COPY shared/. ./shared/
COPY backend/. ./backend/

RUN apk add --no-cache git
RUN npm run build -w backend

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/drizzle ./backend/drizzle
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
WORKDIR /app
CMD ["npm", "run", "start", "-w", "backend"]
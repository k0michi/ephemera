FROM node:24-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci
COPY .git ./.git
COPY shared/. ./shared/
COPY backend/. ./backend/
RUN npm run build -w backend

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/drizzle ./backend/drizzle
RUN npm ci --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "backend"]
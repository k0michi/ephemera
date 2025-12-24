FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/. ./shared/
COPY backend/package.json ./backend/
RUN npm ci
COPY shared/. ./shared/
COPY backend/. ./backend/
WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist
EXPOSE 3000
WORKDIR /app
CMD ["npm", "run", "start", "-w", "backend"]
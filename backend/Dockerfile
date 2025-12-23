FROM node:20-alpine AS builder
WORKDIR /app
COPY shared/. ./shared/
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci
WORKDIR /app
COPY backend/. ./backend/
WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
WORKDIR /app/backend
CMD ["npm", "run", "start"]
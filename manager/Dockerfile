FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/. ./shared/
COPY manager/package.json ./manager/
RUN npm ci
COPY shared/. ./shared/
COPY manager/. ./manager/
RUN npm run build -w manager

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY manager/package.json ./manager/
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/manager/dist ./manager/dist
EXPOSE 3000
WORKDIR /app
ENTRYPOINT ["npm", "run", "start", "-w", "manager", "--"]
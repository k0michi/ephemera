FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/. ./shared/
COPY peer/package.json ./peer/
RUN npm ci
COPY shared/. ./shared/
COPY peer/. ./peer/
RUN npm run build -w peer

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./
COPY peer/package.json ./peer/
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/peer/dist ./peer/dist
EXPOSE 3000
WORKDIR /app
CMD ["npm", "run", "start", "-w", "peer"]
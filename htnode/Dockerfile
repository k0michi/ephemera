FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/. ./shared/
COPY node/package.json ./node/
RUN npm ci
COPY shared/. ./shared/
COPY node/. ./node/
RUN npm run build -w node

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package.json package-lock.json ./
COPY node/package.json ./node/
RUN npm ci --omit=dev
WORKDIR /app
COPY --from=builder /app/node/dist ./node/dist
EXPOSE 3000
WORKDIR /app
CMD ["npm", "run", "start", "-w", "node"]
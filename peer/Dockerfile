FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY peer/package.json ./peer/
RUN npm ci
COPY shared/. ./shared/
COPY peer/. ./peer/
RUN npm run build -w peer

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY peer/package.json ./peer/
RUN npm ci --omit=dev
COPY --from=builder /app/peer/dist ./peer/dist
CMD ["npm", "run", "start", "-w", "peer"]
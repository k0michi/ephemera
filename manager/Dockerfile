FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY manager/package.json ./manager/
COPY shared/package.json ./shared/
RUN npm ci

ENTRYPOINT ["npm", "run", "start", "-w", "manager", "--"]
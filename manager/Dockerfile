FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY manager/package.json ./manager/
COPY shared/package.json ./shared/
RUN npm ci

ENTRYPOINT ["npm", "run", "start", "-w", "manager", "--"]
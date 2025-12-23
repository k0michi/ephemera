FROM node:20-alpine AS development-dependencies-env
COPY frontend/. /app/frontend/
WORKDIR /app/frontend
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY frontend/package.json frontend/package-lock.json /app/frontend/
WORKDIR /app/frontend
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY frontend/. /app/frontend/
COPY shared/. /app/shared/
COPY --from=development-dependencies-env /app/frontend/node_modules /app/frontend/node_modules
WORKDIR /app/frontend
RUN npm run build

FROM node:20-alpine
COPY frontend/package.json frontend/package-lock.json /app/frontend/
COPY --from=production-dependencies-env /app/frontend/node_modules /app/frontend/node_modules
COPY --from=build-env /app/frontend/build /app/frontend/build
WORKDIR /app/frontend
CMD ["npm", "run", "start"]
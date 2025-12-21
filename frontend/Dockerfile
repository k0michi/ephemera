FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm install -g pnpm --prod && pnpm install --frozen-lockfile

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN npm install -g pnpm --prod && pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm install -g pnpm --prod && pnpm run build

FROM node:20-alpine
COPY ./package.json pnpm-lock.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
RUN npm install -g pnpm --prod
CMD ["pnpm", "run", "start"]
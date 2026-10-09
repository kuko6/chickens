# The bundle is platform independent, so build it natively even when targeting another arch.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.2 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.4.2

WORKDIR /app

COPY package.json server.ts ./
COPY src/ws.ts ./src/ws.ts
COPY --from=build /app/dist ./dist

EXPOSE 3000

USER bun
CMD ["bun", "run", "prod"]

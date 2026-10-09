# The bundle is platform independent, so build it natively even when targeting another arch.
FROM --platform=$BUILDPLATFORM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.ts ./
COPY src/ws.ts ./src/ws.ts
COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node
CMD ["npm", "run", "prod"]

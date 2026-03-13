FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.cjs ./server.cjs

EXPOSE 3000
CMD ["node", "server.cjs"]

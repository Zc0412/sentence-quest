FROM node:22-alpine AS admin-build
WORKDIR /app/admin-web
COPY admin-web/package*.json ./
RUN npm ci
COPY admin-web/ ./
RUN npm run build

FROM node:22-alpine AS service-build
WORKDIR /app/service
COPY service/package*.json ./
RUN npm ci
COPY service/tsconfig.json ./
COPY service/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app/service
ENV NODE_ENV=production PORT=8080
COPY --from=service-build /app/service/package*.json ./
COPY --from=service-build /app/service/node_modules ./node_modules
COPY --from=service-build /app/service/dist ./dist
COPY --from=admin-build /app/admin-web/dist /app/admin-web/dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]

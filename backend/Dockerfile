FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci -w backend
COPY backend backend
RUN npm run build -w backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci -w backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
CMD ["node", "backend/dist/main.js"]

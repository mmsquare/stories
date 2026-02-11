FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN apk del python3 make g++
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV DB_PATH=/app/data/reminder.db
RUN mkdir -p /app/data
VOLUME /app/data

CMD ["node", "dist/index.js"]

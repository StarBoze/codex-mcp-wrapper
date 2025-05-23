FROM node:22-alpine AS base
WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package*.json ./
RUN npm install --production \
    && npm rebuild sqlite3 --build-from-source \
    && npm install -g @openai/codex

COPY . .
RUN npm run build

EXPOSE 8123
CMD ["node", "dist/main.js"]

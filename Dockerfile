FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
CMD ["node","dist/main.js"]
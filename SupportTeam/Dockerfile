FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]

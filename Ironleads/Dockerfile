FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV IRONLEADS_DATABASE_URL=file:./data/ironleads.db
ENV IRONLEADS_CHECKPOINT_DATABASE_URL=file:./data/ironleads-checkpoints.db
RUN mkdir -p data && npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]

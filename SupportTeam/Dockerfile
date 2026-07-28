# Build from monorepo root:
#   docker build -f SupportTeam/Dockerfile -t ironframe-support-team .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY lib/ironframeProductKnowledge ./lib/ironframeProductKnowledge

COPY SupportTeam/package.json SupportTeam/package-lock.json ./SupportTeam/
WORKDIR /app/SupportTeam
RUN npm ci
COPY SupportTeam ./
RUN npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/boot.ts"]

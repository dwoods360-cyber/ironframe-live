# Build from monorepo root:
#   docker build -f SalesTeam/Dockerfile -t ironframe-salesteam .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY lib/ironframeProductKnowledge ./lib/ironframeProductKnowledge

COPY SalesTeam/package.json SalesTeam/package-lock.json ./SalesTeam/
WORKDIR /app/SalesTeam
RUN npm ci
COPY SalesTeam ./
RUN npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/boot.ts"]

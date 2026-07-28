# Build from monorepo root:
#   docker build -f SuccessTeam/Dockerfile -t ironframe-success-team .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY lib/ironframeProductKnowledge ./lib/ironframeProductKnowledge

COPY SuccessTeam/package.json SuccessTeam/package-lock.json ./SuccessTeam/
WORKDIR /app/SuccessTeam
RUN npm ci
COPY SuccessTeam ./
RUN npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/boot.ts"]

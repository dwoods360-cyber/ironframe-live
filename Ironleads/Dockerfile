# Build from monorepo root:
#   docker build -f Ironleads/Dockerfile -t ironframe-ironleads .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Shared commercial spine (imports resolve ../../../lib from Ironleads/src/*)
COPY lib/ironframeProductKnowledge ./lib/ironframeProductKnowledge

COPY Ironleads/package.json Ironleads/package-lock.json ./Ironleads/
WORKDIR /app/Ironleads
RUN npm ci
COPY Ironleads ./
ENV IRONLEADS_DATABASE_URL=file:./data/ironleads.db
ENV IRONLEADS_CHECKPOINT_DATABASE_URL=file:./data/ironleads-checkpoints.db
RUN mkdir -p data && npm run db:generate && npm run db:push
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/boot.ts"]

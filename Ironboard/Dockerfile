# Build from monorepo root:
#   docker build -f Ironboard/Dockerfile -t ironframe-ironboard .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Repo-root Prisma client (Ironboard getPrisma() resolves ../../../node_modules/@prisma/client)
COPY prisma ./prisma
COPY lib/crm ./lib/crm
RUN npm install --no-save prisma@6.19.2 @prisma/client@6.19.2 \
  && npx prisma generate

COPY Ironboard/package.json Ironboard/package-lock.json ./Ironboard/
WORKDIR /app/Ironboard
RUN npm ci
COPY Ironboard ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]

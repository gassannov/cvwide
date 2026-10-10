FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
USER 1000:1001
ENV NODE_ENV=production PORT=4312 CVWIDE_DATA_DIR=/data CVWIDE_BASE_PATH=/cvwide CVWIDE_PUBLIC_ORIGIN=https://maratik.fun HOME=/home/maratik
CMD ["node", "server.mjs"]

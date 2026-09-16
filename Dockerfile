FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://is_app:is_app_password@postgres:5432/information_security
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npm start"]

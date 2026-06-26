FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/school_erp?schema=public
ENV DIRECT_DATABASE_URL=postgresql://postgres:postgres@db:5432/school_erp?schema=public
ENV APP_URL=http://localhost:3000
ENV SESSION_SECRET=replace-with-a-long-random-secret-please-change-me
ENV APP_NAME=VidyaStack\ ERP
ENV SESSION_COOKIE_NAME=school_erp_session
ENV DEFAULT_SCHOOL_NAME=Springfield\ Public\ School
ENV DEFAULT_ADMIN_EMAIL=admin@school.local
ENV DEFAULT_ADMIN_PASSWORD=ChangeMe123!
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
EXPOSE 3000
CMD ["sh", "./scripts/docker-entrypoint.sh"]

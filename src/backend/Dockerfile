# Dockerfile multi-estágio para implantação em Nuvem / Container do Backend (Monorepo src/)
# Contexto de build esperado: pasta `src/` (ex.: `docker build -f backend/Dockerfile src`)
FROM node:22-alpine AS builder

WORKDIR /workspace

# Instalar dependências completas (incluindo TypeScript para compilação)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copiar código compartilhado e backend para compilação
COPY packages/shared ./packages/shared
COPY backend ./backend

RUN cd backend && npm run build

# Estágio enxuto de produção (Princípio do Menor Privilégio - usuário não-root)
FROM node:22-alpine AS runner

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /workspace/backend/dist ./dist

USER node

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/backend/src/server.js"]

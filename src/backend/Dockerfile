# Dockerfile para implantação em Nuvem / Container do Backend
FROM node:22-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código compilado ou fonte
COPY . .
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/server.js"]

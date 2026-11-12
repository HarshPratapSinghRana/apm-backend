FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm install express cors --omit=dev && npm cache clean --force

# Copy backend application files
COPY api ./api

EXPOSE 3000

CMD ["node", "api/index.js"]

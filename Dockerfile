FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run db:push && npx tsx db/seed.ts && npm start"]

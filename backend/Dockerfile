FROM node:22-alpine

WORKDIR /app

COPY backend/package.json ./

RUN npm install

COPY backend/ .

COPY openapi.yaml ./openapi.yaml

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

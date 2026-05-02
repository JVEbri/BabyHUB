FROM node:22-alpine as builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Simple static server for production build
RUN npm install -g serve
CMD ["npx", "serve", "-l", "8080", "-s", "dist", "--no-clipboard"]

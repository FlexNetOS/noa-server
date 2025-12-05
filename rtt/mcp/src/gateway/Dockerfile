FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* /app/
RUN npm i -g pnpm && pnpm install --frozen-lockfile || npm install
COPY tsconfig.json /app/
COPY src /app/src
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["node","--require","./dist/otel-preload.js","dist/index.js"]

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* /app/
RUN npm i -g pnpm && pnpm install --frozen-lockfile || npm install
COPY tsconfig.json /app/
COPY src /app/src
RUN npm run build
ENV MCP_TRANSPORT=http PORT=3000
CMD ["npm","start"]
FROM node:20-alpine

RUN apk add --no-cache bash
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY tsconfig.json hardhat.config.ts .env.example ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY docs ./docs
COPY flow-testing-scripts ./flow-testing-scripts
COPY README.md ./

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=4000

EXPOSE 4000

CMD ["pnpm", "run", "dev"]

FROM node:22-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm generate
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-slim AS deploy
# Install dependencies for PostgreSQL, MySQL, and MongoDB tools
RUN apt-get update &&apt-get install -y wget gnupg

# Install PostgreSQL client (includes pg_dump)
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" >> /etc/apt/sources.list.d/pgdg.list
RUN apt-get update
RUN apt-get install --install-recommends -y postgresql-client

# Install MySQL client (includes mysqldump)
RUN apt-get install -y default-mysql-client

# Install MongoDB Database Tools (includes mongodump)
RUN  wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add - 
RUN echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
RUN apt-get update 
RUN apt-get install -y mongodb-database-tools

# Clean up
RUN rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/openapi.json /app/openapi.json
COPY proto proto
EXPOSE 3000
CMD [ "node", "dist/main" ]

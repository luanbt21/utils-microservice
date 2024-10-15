# Utils

## Description

Swagger at [/api-docs](http://localhost:3000/api-docs)

## Installation

```bash
pnpm install
```

```bash
pnpm generate
```

```bash
pnpm migrate:dev
```

```bash
pnpm protoc
```

## Running the app

```bash
# development
$ pnpm start:dev

# production mode
$ pnpm run start:prod
```

## Workflow

**Note**: Before you edit or add schema in `zmodel` folder, pull the latest changes from GitHub and run `pnpm migrate:dev`

1. Edit or add schema in `zmodel` folder
2. Run `pnpm generate` to generate prisma schema
3. Run `pnpm migrate:dev` for create a migration from changes in schema, apply it to the database **_Use it only in development, You can't migrate down_**
4. If typescript doesn't work, restart your TS language server
5. You can use `pnpm studio` to open Prisma Studio(web app for managing databases)
6. Start development with `pnpm start:dev`
7. Make sure your model changes is OK before pushing to GitHub

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

# El Baul Backend

Backend service using Supabase Edge Functions and Hono.

## Prerequisites

- [Docker](https://www.docker.com/) installed and running.
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
  installed.
- [Node.js](https://nodejs.org/) (for running scripts via npm).

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd el-baul-backend
   ```

2. **Setup environment variables:**

   Copy `supabase/.env.example` to `supabase/.env` and set the Google OAuth client secret:

   ```bash
   cp .env.example .env
   ```

   Set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` in `supabase/.env` with your Google OAuth app secret.

3. **Start Supabase services:**

   ```bash
   npm run supabase:start
   ```

4. **Serve the functions locally:**

   ```bash
   npm run dev
   ```

   The server will be available at `http://127.0.0.1:54321/functions/v1/server`.

## Available Scripts

- `npm run supabase:start`: Starts the local Supabase environment using Docker.
- `npm run supabase:stop`: Stops the local Supabase environment.
- `npm run supabase:reset`: Resets the local database to the current migrations.
- `npm run dev`: Starts the Supabase functions locally in watch mode.
- `npm run test`: Runs the test suite.

## Supabase Cloud – First project setup

### 1. Link the local project with Supabase cloud

```bash
supabase link --project-ref <PROJECT_REF>
```

> `PROJECT_REF` is the short project ID (found in the dashboard and in the URL).

Example:

```bash
supabase link --project-ref abcdefghijklmnop
```

### 2. Push database schema (migrations)

If you already have SQL migrations in `supabase/migrations`:

```bash
supabase db push
```

### 3. Create and deploy Edge Functions

```bash
supabase functions deploy server
```

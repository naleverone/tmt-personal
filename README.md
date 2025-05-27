# Bolt AI TMT

This project is a Vite + React + TypeScript web app that uses Tailwind CSS. A small JSON server is included to simulate a REST API for local development.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the mock API using `json-server`:

   ```bash
   npx json-server --watch db.json --port 3001
   ```

   This will serve the contents of `db.json` at `http://localhost:3001`.

3. In another terminal, start the Vite development server:

   ```bash
   npm run dev
   ```

   The application will be available at the URL printed by Vite (typically `http://localhost:5173`).

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The built assets will be output to the `dist` directory.


# Chit Fund Management Frontend

Frontend application for the Chit Fund Management System built with React, TypeScript, and Vite.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Socket.IO Client

## Environment Variables

Create a `.env` file in the `frontend` directory with:

```env
VITE_API_URL=http://localhost:3001/
VITE_SOCKET_URL=http://localhost:3001/
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build production bundle
npm run preview  # Preview production build
```

## Docker

Build image:

```bash
docker build -t chit-fund-frontend:latest .
```

Run container:

```bash
docker run -d --name chit-fund-frontend -p 8080:80 chit-fund-frontend:latest
```

App URL:

```text
http://localhost:8080
```

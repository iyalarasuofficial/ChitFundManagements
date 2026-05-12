# Docker Setup Guide

This guide explains how to run the entire Chit Fund Management System using Docker (database, backend API, and frontend UI).

## Prerequisites
- Docker installed ([Download Docker](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (included with Docker Desktop)

## Quick Start - All Services Together

### 1. Build and Run Everything

```bash
# Navigate to project root
cd chit-fund-management

# Copy environment variables (optional - defaults will work)
cp backend/.env.example backend/.env

# Start all services (database + backend + frontend)
docker-compose up -d --build

# Run database migrations
docker-compose exec backend npm run prisma:migrate:deploy
```

**All services will be ready in ~30 seconds:**
- **Frontend UI:** http://localhost (or http://localhost:80)
- **Backend API:** http://localhost:3001
- **Database:** localhost:5432 (PostgreSQL)

Just open http://localhost in your browser and use the app!

---

## 2. Stop All Services

```bash
docker-compose down
```

To also remove data volumes:
```bash
docker-compose down -v
```

---

## Services Overview

| Service | Port | Purpose | Technology |
|---------|------|---------|------------|
| `frontend` | 80 | React UI | Nginx + React |
| `backend` | 3001 | Express API | Node.js Express |
| `db` | 5432 | PostgreSQL Database | PostgreSQL 15 |

---

## Environment Configuration

### Backend `.env`
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

Example values (adjust for production):
```
DATABASE_URL="postgresql://postgres:password@db:5432/chit_fund"
JWT_SECRET="super-secret-key-change-in-production"
PORT=3001
NODE_ENV=development
```

### Frontend Configuration
Frontend automatically uses Docker service DNS names:
- API calls go to `http://backend:3001/`
- Socket.IO connects to `http://backend:3001/`

These are set in `docker-compose.yml` build arguments.

---

## Useful Docker Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f db
```

### Execute Commands
```bash
# Run Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio

# Run Prisma migrations
docker-compose exec backend npm run prisma:migrate:deploy

# Run backend tests
docker-compose exec backend npm test

# Access database shell
docker-compose exec db psql -U postgres -d chit_fund
```

### Rebuild Services
```bash
# Rebuild specific service
docker-compose up -d --build backend

# Rebuild all
docker-compose up -d --build
```

### Restart Service
```bash
docker-compose restart backend
```

### Remove Everything
```bash
# Stop and remove containers, networks
docker-compose down

# Also remove volumes (data)
docker-compose down -v

# Remove images too
docker-compose down -v --rmi all
```

---

## Troubleshooting

### Frontend Shows Blank Page
1. Check backend is running: `docker-compose logs backend`
2. Check API URL is correct: `docker-compose logs frontend | grep VITE`
3. Clear browser cache: Ctrl+Shift+Delete

### Database Connection Failed
```bash
# Check DB is healthy
docker-compose exec db pg_isready

# View DB logs
docker-compose logs db
```

### Port 80 Already in Use (Windows/Mac)
Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8080:80"  # Change 80 to 8080
```
Then access at: http://localhost:8080

### "Cannot GET /" on Frontend
1. Backend must be running first
2. Check: `docker-compose exec frontend ls -la /usr/share/nginx/html/`
3. Rebuild: `docker-compose up -d --build frontend`

### Prisma Migration Issues
```bash
# Force reset (WARNING: Deletes data!)
docker-compose exec backend npx prisma migrate reset

# Or just deploy migrations
docker-compose exec backend npx prisma migrate deploy
```

---

## Production Deployment

### Build and Push Images

```bash
# Build frontend image
docker build -t your-registry/chit-fund-frontend:v1.0.0 ./frontend

# Build backend image
docker build -t your-registry/chit-fund-backend:v1.0.0 ./backend

# Push to registry (Docker Hub, AWS ECR, etc.)
docker push your-registry/chit-fund-frontend:v1.0.0
docker push your-registry/chit-fund-backend:v1.0.0
```

### Deploy to Cloud

For Kubernetes, AWS ECS, Google Cloud Run, etc., use the pushed images:
```yaml
# Example for Kubernetes
apiVersion: v1
kind: Pod
metadata:
  name: chit-fund
spec:
  containers:
  - name: frontend
    image: your-registry/chit-fund-frontend:v1.0.0
  - name: backend
    image: your-registry/chit-fund-backend:v1.0.0
  - name: db
    image: postgres:15-alpine
```

---

## Health Checks

### Frontend Health
```bash
curl http://localhost
# Should return HTML page
```

### Backend Health
```bash
curl http://localhost:3001/health
# Should return 200 OK
```

### Database Health
```bash
docker-compose exec db pg_isready
# Should return "accepting connections"
```

---

## Manual Setup (Without Docker)

If you prefer not to use Docker:

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## File Structure for Docker

```
chit-fund-management/
├── docker-compose.yml       # Main Docker orchestration
├── backend/
│   ├── Dockerfile           # Backend image build
│   ├── .dockerignore
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
├── frontend/
│   ├── Dockerfile           # Frontend image build
│   ├── .dockerignore
│   ├── nginx.conf           # Nginx config for SPA routing
│   ├── package.json
│   └── src/
└── DOCKER_GUIDE.md          # This file
```

---

## Next Steps

1. ✅ Run all services: `docker-compose up -d --build`
2. ✅ Access frontend: http://localhost
3. ✅ Sign up a test user
4. ✅ Create a group and test features
5. ✅ Monitor logs: `docker-compose logs -f`

---

## Resources

- Docker Docs: https://docs.docker.com/
- Docker Compose Docs: https://docs.docker.com/compose/
- Nginx Docs: https://nginx.org/
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Questions?** Check the logs or open an issue on GitHub!

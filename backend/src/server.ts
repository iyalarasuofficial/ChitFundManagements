// server.ts (main entry point for backend)

// Load environment variables FIRST before any other imports
import 'dotenv/config';

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './config/db';
import authRoutes from './routes/auth.route';
import groupRoutes from './routes/group.routes';
import contributionRoutes from './routes/contribution.routes';
import auctionRoutes from './routes/auctions.routes';
import dashboardRoutes from './routes/dashboard.routes';
import walletRoutes from './routes/wallet.routes';

const app: Application = express();
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: '*'
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'CFMS Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to Chit Fund Management System (CFMS) Backend');
});

// REST routes
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/', contributionRoutes);
app.use('/auctions', auctionRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/wallet', walletRoutes);

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Socket.io namespace for auctions
io.of('/auction').on('connection', (socket) => {
  console.info('Client connected to auction namespace:', socket.id);
  
  socket.on('joinGroup', (groupId: number) => {
    socket.join(groupId.toString());
    console.info(`Socket ${socket.id} joined group ${groupId}`);
  });

  socket.on('disconnect', () => {
    console.info('Client disconnected:', socket.id);
  });
});

// Test connection at startup
async function testDbConnection() {
  try {
    await prisma.$connect();
    console.info('PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testDbConnection();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
  console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.info(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', async () => {
  console.info('SIGTERM received. Closing server...');
  await prisma.$disconnect();
  server.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.info('SIGINT received. Closing server...');
  await prisma.$disconnect();
  server.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});
import 'dotenv/config';

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:5173", "wss://localhost:5173", "http://localhost:3001", "https:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(req);
    return `${ip}-${req.body?.phone || 'unknown'}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login/signup attempts. Please try again after 15 minutes.'
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(req);
    return ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.use('/auth', authLimiter, authRoutes);

app.use('/groups', apiLimiter, groupRoutes);
app.use('/', apiLimiter, contributionRoutes);
app.use('/auctions', apiLimiter, auctionRoutes);
app.use('/dashboard', apiLimiter, dashboardRoutes);
app.use('/wallet', apiLimiter, walletRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: err.message || 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter
    });
  }

  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

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

async function testDbConnection() {
  try {
    await prisma.$connect();
    console.info('PostgreSQL connected successfully');
  } catch (error) {
    console.error(' Database connection failed:', error);
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
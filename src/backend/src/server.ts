import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase, pool } from './db';
import { authRouter } from './routes/authRoutes';
import { userRouter } from './routes/userRoutes';
import { auditRouter } from './routes/auditRoutes';

const app = express();

// Middlewares essenciais
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Log de requisições
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rotas da API REST
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/audit-logs', auditRouter);

// Health check e monitoramento básico (Seção 6 do edital FECAP)
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        engine: 'MySQL (MariaDB)',
        status: 'CONNECTED',
      },
      service: 'Smart Tennis Arena Backend API',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        engine: 'MySQL',
        status: 'DISCONNECTED',
        error: err.message,
      },
    });
  }
});

// Tratamento de rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Tratamento global de erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// Inicialização e boot do servidor
async function startServer() {
  try {
    console.log('🔄 Inicializando banco de dados MySQL...');
    await initDatabase();
    console.log('✅ Banco de dados pronto.');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Smart Tennis Arena Backend API rodando em http://localhost:${config.port}`);
      console.log(`📊 Health check disponível em http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('❌ Falha fatal ao iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();

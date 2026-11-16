import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase, pool } from './db';
import { authRouter } from './routes/authRoutes';
import { userRouter } from './routes/userRoutes';
import { auditRouter } from './routes/auditRoutes';
import { drillRouter } from './routes/drillRoutes';
import { sessionRouter } from './routes/sessionRoutes';

const app = express();

// Middlewares essenciais
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '2mb' }));

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
app.use('/api/drills', drillRouter);
app.use('/api/sessions', sessionRouter);

// Especificação OpenAPI 3.0 Documentada (RF18, RF19 e RNF Interoperabilidade)
app.get('/api/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Smart Tennis Arena — Plataforma Mãe & IoT REST API',
      version: '1.1.0',
      description:
        'Contratos REST/JSON versionados para consumo e publicação de treinos gamificados (RF14-RF16, RF18, RF20), envio idempotente de resultados e telemetria (RF13, RF19, RF21), RBAC (RF01, RF17) e auditoria (RF22, RF23).',
    },
    paths: {
      '/api/health': { get: { summary: 'Status de saúde da API e conexão MySQL' } },
      '/api/auth/login': { post: { summary: 'Autenticação JWT por perfil (RF01)' } },
      '/api/auth/register': { post: { summary: 'Cadastro de usuário e perfil do praticante (RF01, RF02)' } },
      '/api/auth/reset-password': { post: { summary: 'Redefinição de senha (estado formal q3)' } },
      '/api/auth/me': { get: { summary: 'Dados do usuário autenticado' } },
      '/api/auth/profile': { put: { summary: 'Atualização do perfil esportivo (RF02)' } },
      '/api/drills': {
        get: { summary: 'Catálogo de treinos com filtros por público, categoria, dificuldade e status (RF03, RF18)' },
        post: { summary: 'Criação/edição de treino com validação formal e metadados de marketplace (RF14, RF15, RF20)' },
      },
      '/api/drills/{id}': {
        get: { summary: 'Detalhes, preparação, versão e changelog do treino (RF04, RF16, RF18)' },
        put: { summary: 'Atualização completa e versionamento de treino (RF14, RF16)' },
      },
      '/api/drills/{id}/status': {
        patch: { summary: 'Publicação, revisão ou arquivamento de versão de treino (RF16)' },
      },
      '/api/sessions': {
        get: { summary: 'Consulta de histórico de sessões por período e treino (RF13)' },
        post: { summary: 'Envio idempotente de resultados da sessão e telemetria com proteção LGPD (RF19, RF21)' },
      },
      '/api/sessions/stats': {
        get: { summary: 'Indicadores agregados de precisão, consistência, volume e progressão (RF13)' },
      },
      '/api/users': { get: { summary: 'Listagem administrativa de usuários e comissões (RF17)' } },
      '/api/audit-logs': { get: { summary: 'Trilha de auditoria administrativa e segurança (RF23)' } },
      '/api/audit-logs/event': { post: { summary: 'Registro de eventos críticos e parada segura !EMG (RF22, RF23)' } },
    },
  });
});

// Health check e monitoramento básico (Seção 6 do edital FECAP)
app.get('/api/health', async (_req: Request, res: Response) => {
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
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
      console.log(`📘 Especificação OpenAPI disponível em http://localhost:${config.port}/api/openapi.json`);
    });
  } catch (err) {
    console.error('❌ Falha fatal ao iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();

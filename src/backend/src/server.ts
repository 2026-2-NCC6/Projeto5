import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase, pool } from './db';
import { authRouter } from './routes/authRoutes';
import { userRouter } from './routes/userRoutes';
import { auditRouter } from './routes/auditRoutes';
import { drillRouter } from './routes/drillRoutes';
import { sessionRouter } from './routes/sessionRoutes';
<<<<<<< HEAD
=======
import { incidentRouter } from './routes/incidentRoutes';
import { categoryRouter, deviceRouter, settingsRouter } from './routes/adminRoutes';
import { motherPlatformRouter } from './routes/motherPlatformRoutes';
import { hardwareGateway } from './services/hardwareGateway';
import { isAllowedCorsOrigin, securityHeaders } from './middlewares/security';
import {
  correlationAndStructuredLogger,
  getObservabilityMetrics,
} from './middlewares/observability';
import { openApiSpec, renderOpenApiDocsHtml } from './docs/openapi';
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

const app = express();
app.disable('x-powered-by');

// Cabeçalhos de segurança OWASP Top 10 e CORS controlado por ambiente
app.use(securityHeaders);
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem bloqueada pela política de CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  })
);
<<<<<<< HEAD
app.use(express.json({ limit: '2mb' }));
=======
app.use(express.json({ limit: '256kb' }));
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

// Observabilidade: Correlation ID + Logs estruturados JSON + Métricas de latência (Seção 5)
app.use(correlationAndStructuredLogger);

// Documentação OpenAPI 3.0.3 e Explorador Interativo (RF18, Seções 5 e 6)
for (const prefix of ['/api/v1', '/api']) {
  app.get(`${prefix}/openapi.json`, (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });
  app.get(`${prefix}/docs`, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderOpenApiDocsHtml());
  });
}

<<<<<<< HEAD
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
=======
// Rotas da API REST (suporta /api/v1/* versionado e mantém /api/* para compatibilidade integral)
for (const prefix of ['/api/v1', '/api']) {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/users`, userRouter);
  app.use(`${prefix}/audit-logs`, auditRouter);
  app.use(`${prefix}/drills`, drillRouter);
  app.use(`${prefix}/sessions`, sessionRouter);
  app.use(`${prefix}/incidents`, incidentRouter);
  app.use(`${prefix}/categories`, categoryRouter);
  app.use(`${prefix}/devices`, deviceRouter);
  app.use(`${prefix}/settings`, settingsRouter);
  app.use(`${prefix}/mother-platform`, motherPlatformRouter);
}

// Health check e monitoramento com métricas de latência (Seções 5 e 6 do edital FECAP)
const healthHandler = async (_req: Request, res: Response) => {
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'UP',
      version: '1.2.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        engine: 'MySQL (MariaDB)',
        status: 'CONNECTED',
      },
      motherPlatform: {
        mode: config.motherPlatform.mode,
      },
      observability: getObservabilityMetrics(),
      service: 'Smart Tennis Arena Backend API',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      version: '1.2.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        engine: 'MySQL',
        status: 'DISCONNECTED',
        error: err.message,
      },
    });
  }
};

app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Status do Gateway WebSocket para hardware e celular
app.get(['/api/v1/hardware/gateway-status', '/api/hardware/gateway-status'], (_req: Request, res: Response) => {
  res.json(hardwareGateway.getState());
});

// Tratamento de rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    correlationId: req.correlationId,
  });
});

// Tratamento global de erros
<<<<<<< HEAD
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
=======
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err?.message === 'Origem bloqueada pela política de CORS') {
    res.status(403).json({ error: err.message, correlationId: req.correlationId });
    return;
  }
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Erro interno no servidor', correlationId: req.correlationId });
});

// Inicialização e boot do servidor
async function startServer() {
  try {
    console.log('🔄 Inicializando banco de dados MySQL...');
    await initDatabase();
    console.log('✅ Banco de dados pronto.');

    const server = http.createServer(app);
    hardwareGateway.init(server);

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Smart Tennis Arena Backend API rodando em http://localhost:${config.port}`);
<<<<<<< HEAD
      console.log(`📊 Health check disponível em http://localhost:${config.port}/api/health`);
      console.log(`📘 Especificação OpenAPI disponível em http://localhost:${config.port}/api/openapi.json`);
=======
      console.log(`📊 Health check disponível em http://localhost:${config.port}/api/v1/health`);
      console.log(`📘 Documentação OpenAPI disponível em http://localhost:${config.port}/api/v1/docs`);
      console.log(`📡 Hardware Gateway WebSocket disponível em ws://localhost:${config.port}/ws/hardware`);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
    });
  } catch (err) {
    console.error('❌ Falha fatal ao iniciar o servidor:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };

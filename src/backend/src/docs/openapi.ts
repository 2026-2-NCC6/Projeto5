/**
 * Especificação Oficial OpenAPI 3.0.3 e Explorador Interativo Autônomo (Zero CDN)
 * Alinhado com: RF18, RF19, RF20, RF22, RF23, Seção 5 (Interoperabilidade) e Seção 6 (OpenAPI/Swagger)
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Tennis Arena — REST API Oficial',
    version: '1.2.0',
    description:
      'API versionada do ecossistema Smart Tennis Arena (6º CCOMP FECAP 2026). Cobre autenticação RBAC, proteção LGPD de menores, catálogo e versionamento de treinos, metadados de marketplace, sincronização idempotente de sessões/telemetria, pareamento seguro IoT, parada de emergência (!EMG) e integração com a Plataforma Mãe SmartTennis.',
  },
  servers: [
    { url: '/api/v1', description: 'API Oficial Versionada (v1)' },
    { url: '/api', description: 'Alias Retrocompatível' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Observabilidade'],
        summary: 'Health check do servidor, banco MySQL e métricas de latência',
        responses: { '200': { description: 'Serviço operacional' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Auto-cadastro público de praticante (restrito ao perfil JOGADOR + consentimento parental para KIDS)',
        responses: {
          '201': { description: 'Conta criada com token JWT' },
          '403': { description: 'Tentativa bloqueada de escalonamento de privilégio' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Autenticação com e-mail e senha (protegido por rate limit)',
        responses: { '200': { description: 'Autenticado com sucesso' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Encerra a sessão revogando o JWT atual e registrando LOGOUT na auditoria',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Sessão revogada' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Obtém dados e perfil RF02 do usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dados do titular' } },
      },
      delete: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Exclusão da própria conta pelo titular (Direito LGPD)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Conta excluída' } },
      },
    },
    '/auth/profile': {
      put: {
        tags: ['Autenticação & LGPD (RF01, RF02)'],
        summary: 'Atualiza nível técnico, objetivos, preferências, restrições físicas e consentimento de telemetria',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Perfil atualizado' } },
      },
    },
    '/drills': {
      get: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Lista catálogo de treinos com filtros por público, dificuldade, categoria, duração e sensores',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'difficulty', in: 'query', schema: { type: 'integer' } },
          { name: 'targetAudience', in: 'query', schema: { type: 'string' } },
          { name: 'isKidsAdapted', in: 'query', schema: { type: 'boolean' } },
          { name: 'maxDurationSec', in: 'query', schema: { type: 'integer' } },
          { name: 'sensor', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lista de treinos compatíveis' } },
      },
      post: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Cria novo treino em DRAFT com parâmetros Spinshot e metadados de Marketplace (TREINADOR/ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Rascunho criado e versionado' } },
      },
    },
    '/drills/validate': {
      post: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Valida regras, janelas de sensores e limites de segurança Spinshot antes da publicação (RF15)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Resultado determinístico da validação' } },
      },
    },
    '/drills/{id}': {
      get: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Retorna definição completa, instruções pré-sessão (RF04) e metadados comerciais (RF20)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Definição completa do treino' } },
      },
      put: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Edita treino existente gerando nova versão e entrada no changelog (RF14, RF16)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Treino atualizado' } },
      },
    },
    '/drills/{id}/versions': {
      get: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Consulta histórico imutável de versões, compatibilidade e changelog do treino (RF16, RF18)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Histórico de versões' } },
      },
    },
    '/drills/{id}/status': {
      post: {
        tags: ['Treinos, Versionamento & Marketplace (RF03, RF16, RF18, RF20)'],
        summary: 'Altera status do ciclo de vida (DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED) com validação formal',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status atualizado e sincronizado com a Plataforma Mãe' } },
      },
    },
    '/sessions': {
      post: {
        tags: ['Sessões, Telemetria & Analytics (RF12, RF13, RF19, RF21)'],
        summary: 'Sincroniza resumo e telemetria (quando consentido via LGPD) com chave de idempotência',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Sessão persistida e encaminhada à Plataforma Mãe' },
          '200': { description: 'Replay idempotente reconhecido sem duplicação' },
        },
      },
      get: {
        tags: ['Sessões, Telemetria & Analytics (RF12, RF13, RF19, RF21)'],
        summary: 'Lista sessões filtradas por período, treino, status e atleta (com proteção LGPD Kids)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'drillId', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'integer' } },
          { name: 'anonymize', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Histórico de sessões' } },
      },
    },
    '/sessions/analytics': {
      get: {
        tags: ['Sessões, Telemetria & Analytics (RF12, RF13, RF19, RF21)'],
        summary: 'Retorna métricas consolidadas de precisão, consistência, tempo, volume e curva de progressão (RF13)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Indicadores analíticos e recomendações' } },
      },
    },
    '/sessions/{id}': {
      get: {
        tags: ['Sessões, Telemetria & Analytics (RF12, RF13, RF19, RF21)'],
        summary: 'Detalhes completos de uma sessão e linha do tempo de eventos dos sensores',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Sessão detalhada' } },
      },
    },
    '/incidents': {
      post: {
        tags: ['Segurança Física & Parada de Emergência (RF22, RF23)'],
        summary: 'Registra acionamento de !EMG, perda de comunicação ou falha de sensor com motivo',
        responses: { '201': { description: 'Incidente crítico registrado' } },
      },
      get: {
        tags: ['Segurança Física & Parada de Emergência (RF22, RF23)'],
        summary: 'Lista incidentes de parada segura e falhas na arena (TREINADOR/ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lista de incidentes' } },
      },
    },
    '/incidents/{id}/resolve': {
      patch: {
        tags: ['Segurança Física & Parada de Emergência (RF22, RF23)'],
        summary: 'Registra verificação e reinício seguro após parada de emergência',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Incidente resolvido' } },
      },
    },
    '/devices': {
      get: {
        tags: ['Dispositivos IoT & Gestão Administrativa (RF05, RF17)'],
        summary: 'Lista controladores IoT, status de comunicação e saúde dos 5 sensores piezoelétricos',
        responses: { '200': { description: ' Controladores IoT cadastrados' } },
      },
      post: {
        tags: ['Dispositivos IoT & Gestão Administrativa (RF05, RF17)'],
        summary: 'Cadastra novo controlador IoT gerando token protegido por hash (ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Dispositivo criado' } },
      },
    },
    '/devices/pair': {
      post: {
        tags: ['Dispositivos IoT & Gestão Administrativa (RF05, RF17)'],
        summary: 'Autentica pareamento autorizado do controlador IoT via token e atualiza status dos sensores (RF05)',
        responses: { '200': { description: 'Controlador autenticado' }, '401': { description: 'Token inválido' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Dispositivos IoT & Gestão Administrativa (RF05, RF17)'],
        summary: 'Lista categorias oficiais de treinos e marketplace',
        responses: { '200': { description: 'Categorias ativas' } },
      },
    },
    '/settings': {
      get: {
        tags: ['Dispositivos IoT & Gestão Administrativa (RF05, RF17)'],
        summary: 'Lista parâmetros gerais de operação, limites de velocidade e segurança da Arena',
        responses: { '200': { description: 'Configurações do sistema' } },
      },
    },
    '/users': {
      get: {
        tags: ['Usuários & Auditoria (RF01, RF17, RF23)'],
        summary: 'Lista usuários aplicando política LGPD de menores e opção ?anonymize=true (TREINADOR/ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Usuários listados' } },
      },
      post: {
        tags: ['Usuários & Auditoria (RF01, RF17, RF23)'],
        summary: 'Criação administrativa de contas incluindo TREINADOR e ADMIN (ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Usuário criado' } },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Usuários & Auditoria (RF01, RF17, RF23)'],
        summary: 'Trilha de auditoria completa com correlationId e severidade (ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Logs de auditoria' } },
      },
    },
    '/mother-platform/catalog': {
      get: {
        tags: ['Integração Plataforma Mãe SmartTennis (RF18, RF19)'],
        summary: 'Catálogo padronizado compatível com a Plataforma Mãe SmartTennis',
        responses: { '200': { description: 'Catálogo interoperável' } },
      },
    },
    '/mother-platform/sync-logs': {
      get: {
        tags: ['Integração Plataforma Mãe SmartTennis (RF18, RF19)'],
        summary: 'Evidências auditáveis de sincronização de treinos e sessões com a Plataforma Mãe',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Recibos de sincronização' } },
      },
    },
  },
};

export function renderOpenApiDocsHtml(): string {
  const endpointsHtml = Object.entries(openApiSpec.paths)
    .flatMap(([path, methods]) =>
      Object.entries(methods as Record<string, any>).map(([method, meta]) => ({
        method: method.toUpperCase(),
        path: `/api/v1${path}`,
        tag: meta.tags?.[0] || 'Geral',
        summary: meta.summary || '',
        secured: Boolean(meta.security?.length),
      }))
    )
    .map(
      (ep) => `
      <div class="ep-card">
        <div class="ep-head">
          <span class="badge m-${ep.method.toLowerCase()}">${ep.method}</span>
          <code class="ep-path">${ep.path}</code>
          ${ep.secured ? '<span class="lock">JWT / RBAC</span>' : '<span class="pub">Público / Local</span>'}
        </div>
        <div class="ep-summary">${ep.summary}</div>
        <div class="ep-tag">${ep.tag}</div>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${openApiSpec.info.title} — OpenAPI ${openApiSpec.openapi}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f6fbf8; color: #0f172a; margin: 0; padding: 32px 20px; }
    .wrap { max-width: 1020px; margin: 0 auto; }
    header { background: #ffffff; border: 1px solid #a7f3d0; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; color: #065f46; }
    p { margin: 0 0 14px; color: #475569; line-height: 1.5; font-size: 14px; }
    .links a { display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-right: 10px; }
    .links a.sec { background: #ecfdf5; color: #065f46; border: 1px solid #059669; }
    .ep-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; }
    .ep-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; color: #fff; min-width: 54px; text-align: center; }
    .m-get { background: #0284c7; }
    .m-post { background: #059669; }
    .m-put { background: #d97706; }
    .m-patch { background: #7c3aed; }
    .m-delete { background: #dc2626; }
    .ep-path { font-size: 14px; font-weight: 600; color: #0f172a; }
    .lock { font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    .pub { font-size: 11px; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    .ep-summary { font-size: 13.5px; color: #334155; margin-bottom: 4px; }
    .ep-tag { font-size: 11.5px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${openApiSpec.info.title} (v${openApiSpec.info.version})</h1>
      <p>${openApiSpec.info.description}</p>
      <div class="links">
        <a href="/api/v1/openapi.json" target="_blank">Baixar Especificação JSON (OpenAPI 3.0.3)</a>
        <a class="sec" href="/api/v1/health" target="_blank">Status & Métricas (/api/v1/health)</a>
        <a class="sec" href="/api/v1/drills" target="_blank">Catálogo de Treinos (/api/v1/drills)</a>
        <a class="sec" href="/api/v1/mother-platform/catalog" target="_blank">Catálogo Plataforma Mãe</a>
      </div>
    </header>
    ${endpointsHtml}
  </div>
</body>
</html>`;
}


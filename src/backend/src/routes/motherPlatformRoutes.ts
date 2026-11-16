import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { authenticateToken, requireRole } from '../middlewares/auth';

export const motherPlatformRouter = Router();

/**
 * GET /mother-platform/catalog
 * Mock compatível da Plataforma Mãe SmartTennis para consulta padronizada de treinos (RF18, Seção 9)
 */
motherPlatformRouter.get('/catalog', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT id, title, description, category, difficulty, target_audience, objective,
              estimated_duration_sec, is_kids_adapted, current_version, author_name,
              steps_json, scoring_rules_json, marketplace_json, published_at
       FROM drills
       WHERE status = 'PUBLISHED'
       ORDER BY updated_at DESC`
    );

    const catalog = rows.map((r) => ({
      externalId: r.id,
      version: r.current_version,
      title: r.title,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      targetAudience: r.target_audience,
      objective: r.objective,
      estimatedDurationSec: r.estimated_duration_sec,
      isKidsAdapted: Boolean(r.is_kids_adapted),
      authorName: r.author_name,
      publishedAt: r.published_at,
      steps: JSON.parse(r.steps_json || '[]'),
      scoringRules: r.scoring_rules_json ? JSON.parse(r.scoring_rules_json) : null,
      marketplace: r.marketplace_json ? JSON.parse(r.marketplace_json) : null,
    }));

    if (req.query.recordEvidence === 'true') {
      const receiptId = `mp-cat-${crypto.randomUUID().slice(0, 12)}`;
      await pool.query(
        `INSERT INTO mother_platform_sync_logs (
          receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
        ) VALUES (?, 'INBOUND_CATALOG', 'catalog-sync', 'mock', 'DELIVERED', 0, ?, ?)`,
        [receiptId, req.correlationId || null, JSON.stringify({ itemsDelivered: catalog.length })]
      );
    }

    res.json({
      platform: 'SmartTennis Mother Platform (Compatible Mock v1)',
      syncedAt: new Date().toISOString(),
      total: catalog.length,
      items: catalog,
    });
  } catch (err) {
    console.error('Erro no mock catalog da plataforma mãe:', err);
    res.status(500).json({ error: 'Falha ao consultar catálogo da plataforma mãe' });
  }
});

/**
 * POST /mother-platform/ingest
 * Endpoint receptor compatível da Plataforma Mãe para testes diretos de interoperabilidade (RF19)
 */
motherPlatformRouter.post('/ingest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const receiptId = `mp-direct-${crypto.randomUUID().slice(0, 12)}`;
    const telemetryAuthorized = Boolean(req.body?.telemetryAuthorized);
    const entityId = String(req.body?.idempotencyKey || req.body?.drillId || 'manual-test').slice(0, 120);

    await pool.query(
      `INSERT INTO mother_platform_sync_logs (
        receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
      ) VALUES (?, 'OUTBOUND_SESSION', ?, 'mock', 'ACCEPTED', ?, ?, ?)`,
      [
        receiptId,
        entityId,
        telemetryAuthorized ? 1 : 0,
        req.correlationId || null,
        JSON.stringify(req.body?.summary || { note: 'Ingestão direta homologada' }),
      ]
    );

    res.status(202).json({
      accepted: true,
      receiptId,
      receivedAt: new Date().toISOString(),
      telemetryAccepted: telemetryAuthorized,
    });
  } catch (err) {
    console.error('Erro na ingestão mock da plataforma mãe:', err);
    res.status(500).json({ error: 'Falha ao registrar ingestão na plataforma mãe' });
  }
});

/**
 * GET /mother-platform/sync-logs
 * Evidências auditáveis de integração com a Plataforma Mãe (Seção 9)
 */
motherPlatformRouter.get(
  '/sync-logs',
  authenticateToken,
  requireRole('TREINADOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const [rows] = await pool.query<any[]>(
        `SELECT id, receipt_id, direction, entity_id, mode, status,
                telemetry_forwarded, correlation_id, payload_summary_json, created_at
         FROM mother_platform_sync_logs
         ORDER BY created_at DESC
         LIMIT ?`,
        [limit]
      );

      res.json(
        rows.map((r) => ({
          id: r.id,
          receiptId: r.receipt_id,
          direction: r.direction,
          entityId: r.entity_id,
          mode: r.mode,
          status: r.status,
          telemetryForwarded: Boolean(r.telemetry_forwarded),
          correlationId: r.correlation_id,
          summary: r.payload_summary_json ? JSON.parse(r.payload_summary_json) : null,
          createdAt: r.created_at,
        }))
      );
    } catch (err) {
      console.error('Erro ao listar evidências da plataforma mãe:', err);
      res.status(500).json({ error: 'Falha ao consultar evidências de integração' });
    }
  }
);


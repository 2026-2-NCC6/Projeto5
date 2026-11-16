import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool, logAuditEvent } from '../db';
import {
  CreateOrUpdateDrillDto,
  DrillCategory,
  DrillDefinition,
  DrillDifficulty,
  DrillLifecycleStatus,
  DrillStatus,
  DrillVersionRecord,
  bumpDrillVersion,
  validateDrillDefinition,
} from '../../../packages/shared/src/contracts/drills';
import { sanitizeOptionalText } from '../../../packages/shared/src/security/validation';
import { recordDrillPublicationOnMotherPlatform } from '../services/motherPlatformService';

function safeJsonParse<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToDrill(r: any): DrillDefinition {
  const version = r.current_version || r.version || '1.0.0';
  const authorName = r.author_name || 'Comissão Técnica Arena';
  const publishedIso = r.published_at ? new Date(r.published_at).toISOString() : null;
  const changelog = safeJsonParse(r.changelog_json, [
    {
      version,
      date: (publishedIso || new Date().toISOString()).split('T')[0],
      author: authorName,
      notes: 'Versão registrada no catálogo Smart Tennis Arena.',
    },
  ]);

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: (r.category as DrillCategory) || DrillCategory.PRECISION,
    difficulty: (Number(r.difficulty) as DrillDifficulty) || DrillDifficulty.INTERMEDIATE,
    recommendedAgeMin: r.recommended_age_min ?? undefined,
    recommendedAgeMax: r.recommended_age_max ?? undefined,
    isKidsAdapted: Boolean(r.is_kids_adapted),
    version,
    authorName,
    authorId: r.author_user_id ?? r.author_id ?? undefined,
    authorUserId: r.author_user_id ?? r.author_id ?? null,
    status: (r.status as DrillStatus) || 'PUBLISHED',
    publishedAt: publishedIso,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    targetAudience: r.target_audience || (r.is_kids_adapted ? 'KIDS' : 'TODOS'),
    objective: r.objective || r.description,
    estimatedDurationSec: Number(r.estimated_duration_sec || 30),
    requiredSensors: safeJsonParse(r.required_sensors_json, [
      'PIEZO_TARGETS',
      'LED_RING',
      'BUZZER',
      'EMERGENCY_STOP',
    ]),
    scoringRules: safeJsonParse(r.scoring_rules_json, undefined),
    preparation: safeJsonParse(r.preparation_json, undefined),
    marketplace: safeJsonParse(r.marketplace_json, undefined),
    changelog,
    steps: safeJsonParse(r.steps_json, []),
  };
}

function slugifyDrillId(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `drill-${base || 'custom'}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * GET /drills
 * Catálogo filtrável por público, objetivo/texto, duração, dificuldade, categoria, status e sensores (RF03, RF18)
 */
export async function listDrills(req: Request, res: Response): Promise<void> {
  try {
    const {
      category,
      difficulty,
      targetAudience,
      isKids,
      isKidsAdapted,
      maxDurationSec,
      sensor,
      status,
      search,
      q,
      authorId,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && typeof status === 'string') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category && typeof category === 'string') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (difficulty !== undefined && difficulty !== '') {
      const diffNum = Number(difficulty);
      if (!Number.isNaN(diffNum)) {
        conditions.push('difficulty = ?');
        params.push(diffNum);
      }
    }

    if (targetAudience && typeof targetAudience === 'string' && targetAudience !== 'TODOS') {
      conditions.push("(target_audience = ? OR target_audience = 'TODOS')");
      params.push(targetAudience);
    }

    const kidsParam = isKidsAdapted !== undefined ? isKidsAdapted : isKids;
    if (kidsParam === 'true' || kidsParam === 'false' || kidsParam === '1' || kidsParam === '0') {
      conditions.push('is_kids_adapted = ?');
      params.push(kidsParam === 'true' || kidsParam === '1' ? 1 : 0);
    }

    if (maxDurationSec !== undefined && maxDurationSec !== '') {
      const maxDur = Number(maxDurationSec);
      if (!Number.isNaN(maxDur) && maxDur > 0) {
        conditions.push('estimated_duration_sec <= ?');
        params.push(maxDur);
      }
    }

    if (authorId !== undefined && authorId !== '') {
      conditions.push('author_user_id = ?');
      params.push(Number(authorId));
    }

    const searchText = (search || q) as string | undefined;
    if (searchText && typeof searchText === 'string' && searchText.trim().length > 0) {
      const term = `%${searchText.trim()}%`;
      conditions.push('(title LIKE ? OR description LIKE ? OR objective LIKE ? OR author_name LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM drills ${whereClause} ORDER BY updated_at DESC, is_kids_adapted DESC, difficulty ASC`,
      params
    );

    let drills = rows.map(mapRowToDrill);

    if (sensor && typeof sensor === 'string' && sensor.trim().length > 0) {
      const requiredSensor = sensor.trim();
      drills = drills.filter((d) => (d.requiredSensors || []).includes(requiredSensor as any));
    }

    res.json(drills);
  } catch (err) {
    console.error('Erro ao listar treinos:', err);
    res.status(500).json({ error: 'Erro interno ao consultar catálogo de treinos' });
  }
}

/**
 * GET /drills/:id
 * Detalhes completos de um treino (RF04, RF16, RF18, RF20)
 */
export async function getDrillById(req: Request, res: Response): Promise<void> {
  try {
    const drillId = req.params.id;
    const [rows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

    res.json(mapRowToDrill(rows[0]));
  } catch (err) {
    console.error('Erro ao obter detalhes do treino:', err);
    res.status(500).json({ error: 'Erro interno ao consultar treino' });
  }
}

/**
 * GET /drills/:id/versions
 * Histórico completo de versões, status, compatibilidade e changelog do treino (RF16, RF18)
 */
export async function getDrillVersions(req: Request, res: Response): Promise<void> {
  try {
    const drillId = req.params.id;
    const [drillRows] = await pool.query<any[]>(
      'SELECT id, status, author_user_id FROM drills WHERE id = ?',
      [drillId]
    );
    if (drillRows.length === 0) {
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

    const [rows] = await pool.query<any[]>(
      `SELECT * FROM drill_versions
       WHERE drill_id = ?
       ORDER BY id DESC`,
      [drillId]
    );

    const versions: DrillVersionRecord[] = rows.map((r) => ({
      id: r.id,
      drillId: r.drill_id,
      version: r.version,
      status: r.status,
      changelog: r.changelog,
      compatibleMachines: safeJsonParse(r.compatible_machines_json, []),
      compatibleHardware: safeJsonParse(r.compatible_hardware_json, []),
      publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
      createdByUserId: r.created_by_user_id,
      createdByName: r.created_by_name,
      snapshot: safeJsonParse(r.snapshot_json, {} as DrillDefinition),
      createdAt: new Date(r.created_at).toISOString(),
    }));

    res.json(versions);
  } catch (err) {
    console.error('Erro ao listar versões do treino:', err);
    res.status(500).json({ error: 'Erro interno ao consultar histórico de versões' });
  }
}

/**
 * POST /drills/validate
 * Validação pré-publicação de regras, limites Spinshot e janelas da FSM (RF15)
 */
export async function validateDrillEndpoint(req: Request, res: Response): Promise<void> {
  const result = validateDrillDefinition(req.body || {});
  res.json(result);
}

/**
 * POST /drills & PUT /drills/:id
 * Criação ou atualização de treino com versionamento, changelog e metadados de marketplace (RF14, RF15, RF16, RF20)
 */
export async function saveOrUpsertDrill(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateOrUpdateDrillDto & Partial<DrillDefinition>;
  const validation = validateDrillDefinition(body);
  if (!validation.valid) {
    res.status(400).json({
      error: validation.errors[0],
      validation,
    });
    return;
  }

  const requestedId = req.params.id || body.id;
  const drillId =
    requestedId && requestedId.trim().length > 0
      ? requestedId.trim()
      : slugifyDrillId(body.title || 'custom');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    const existingRow = existingRows[0] || null;
    const existingDrill = existingRow ? mapRowToDrill(existingRow) : null;

    let finalVersion = body.version && /^\d+\.\d+\.\d+$/.test(body.version) ? body.version : '1.0.0';
    if (existingDrill) {
      if (body.bumpType) {
        finalVersion = bumpDrillVersion(existingDrill.version, body.bumpType);
      } else if (body.version && /^\d+\.\d+\.\d+$/.test(body.version) && body.version !== existingDrill.version) {
        finalVersion = body.version;
      } else if (req.method === 'PUT') {
        finalVersion = bumpDrillVersion(existingDrill.version, 'PATCH');
      } else {
        finalVersion = body.version || existingDrill.version;
      }
    }

    const finalStatus: DrillLifecycleStatus =
      body.status || existingDrill?.status || 'DRAFT';
    const title = sanitizeOptionalText(body.title, 180) || body.title!.trim();
    const description = sanitizeOptionalText(body.description, 1500) || body.description!.trim();
    const objective = sanitizeOptionalText(body.objective, 1000) || description;
    const authorName =
      body.authorName?.trim() ||
      req.user?.name ||
      existingDrill?.authorName ||
      'Carlos Treinador';
    const authorUserId = req.user?.id ?? existingDrill?.authorUserId ?? null;
    const changelogNote =
      sanitizeOptionalText(body.changelog || body.changelogNote, 600) ||
      (existingDrill ? `Atualização para versão ${finalVersion} (${finalStatus})` : 'Criação inicial do treino.');

    const estimatedDurationSec =
      body.estimatedDurationSec ||
      body.preparation?.estimatedDurationSec ||
      validation.computedDurationSec ||
      validation.estimatedDurationSec;

    const requiredSensors =
      Array.isArray(body.requiredSensors) && body.requiredSensors.length > 0
        ? body.requiredSensors
        : ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'];

    const normalizedSteps = (body.steps || []).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));

    const prevChangelog = existingDrill?.changelog || body.changelog || [];
    const newChangelogEntry = {
      version: finalVersion,
      date: new Date().toISOString().split('T')[0],
      author: authorName,
      notes: changelogNote,
    };
    const updatedChangelog = [
      newChangelogEntry,
      ...(Array.isArray(prevChangelog) ? prevChangelog.slice(0, 14) : []),
    ];

    const preparation = body.preparation || existingDrill?.preparation || {
      courtPositioning: 'Posicione-se na marca central da linha de base antes da contagem regressiva.',
      instructions: [
        'Posicione-se na marca central da linha de base antes da contagem regressiva.',
        'Acompanhe a sinalização luminosa dos LEDs nos 5 alvos piezoelétricos.',
      ],
      scoringRulesSummary: body.isKidsAdapted
        ? 'Modo Kids (RN09): +50% de janela temporal e isenção de penalidades.'
        : 'Modo Pro (RN03): Pontuação por tempo restante, multiplicador de streak (até 1.5x) e bônus de força ADC.',
      equipmentRequired: ['Raquete de Tênis', '5 Sensores Piezoelétricos + Controlador Serial'],
      requiredEquipment: ['Raquete de Tênis', '5 Sensores Piezoelétricos + Controlador Serial'],
      safetyWarnings: ['Mantenha a área de cabos e alvos livre de obstáculos físicos.'],
      safetyInstructions: ['Mantenha a área de cabos e alvos livre de obstáculos físicos.'],
      requiredSensors: validation.requiredSensors,
      estimatedDurationSec: validation.estimatedDurationSec,
    };

    const marketplace = body.marketplace || existingDrill?.marketplace || {
      commercialDescription: description,
      compatibility: 'Arduino Uno R3 + Simulador Spinshot',
      categorySlug: 'personalizado',
      compatibleMachines: ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1'],
      compatibleHardware: ['STA-UNO-R3', 'MOCK-DRIVER'],
      licenseType: 'FREE_OPEN',
      remunerationModel: 'FREE',
      monetizationModel: 'FREE',
      suggestedPriceBrl: 0,
      revenueSharePercent: 0,
    };

    const publishedAt =
      finalStatus === 'PUBLISHED'
        ? existingRow?.published_at
          ? new Date(existingRow.published_at)
          : new Date()
        : existingRow?.published_at
          ? new Date(existingRow.published_at)
          : null;

    const snapshot: DrillDefinition = {
      id: drillId,
      title,
      description,
      category: body.category || DrillCategory.PRECISION,
      difficulty: body.difficulty || DrillDifficulty.INTERMEDIATE,
      recommendedAgeMin: body.recommendedAgeMin,
      recommendedAgeMax: body.recommendedAgeMax,
      isKidsAdapted: Boolean(body.isKidsAdapted),
      version: finalVersion,
      authorName,
      authorId: authorUserId ?? undefined,
      authorUserId,
      status: finalStatus,
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      updatedAt: new Date().toISOString(),
      targetAudience: body.targetAudience || (body.isKidsAdapted ? 'KIDS' : 'TODOS'),
      objective,
      estimatedDurationSec,
      requiredSensors: requiredSensors as any,
      scoringRules: body.scoringRules || existingDrill?.scoringRules,
      preparation,
      marketplace,
      changelog: updatedChangelog,
      steps: normalizedSteps,
    };

    await conn.query(
      `INSERT INTO drills (
        id, title, description, category, difficulty, target_audience, objective,
        estimated_duration_sec, recommended_age_min, recommended_age_max, is_kids_adapted,
        current_version, status, author_user_id, author_name, required_sensors_json,
        steps_json, scoring_rules_json, preparation_json, marketplace_json, changelog_json, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        difficulty = VALUES(difficulty),
        target_audience = VALUES(target_audience),
        objective = VALUES(objective),
        estimated_duration_sec = VALUES(estimated_duration_sec),
        recommended_age_min = VALUES(recommended_age_min),
        recommended_age_max = VALUES(recommended_age_max),
        is_kids_adapted = VALUES(is_kids_adapted),
        current_version = VALUES(current_version),
        status = VALUES(status),
        author_name = VALUES(author_name),
        required_sensors_json = VALUES(required_sensors_json),
        steps_json = VALUES(steps_json),
        scoring_rules_json = VALUES(scoring_rules_json),
        preparation_json = VALUES(preparation_json),
        marketplace_json = VALUES(marketplace_json),
        changelog_json = VALUES(changelog_json),
        published_at = COALESCE(VALUES(published_at), published_at)`,
      [
        drillId,
        title,
        description,
        snapshot.category,
        snapshot.difficulty,
        snapshot.targetAudience,
        objective,
        estimatedDurationSec,
        body.recommendedAgeMin ?? null,
        body.recommendedAgeMax ?? null,
        body.isKidsAdapted ? 1 : 0,
        finalVersion,
        finalStatus,
        authorUserId,
        authorName,
        JSON.stringify(requiredSensors),
        JSON.stringify(normalizedSteps),
        JSON.stringify(snapshot.scoringRules || null),
        JSON.stringify(preparation),
        JSON.stringify(marketplace),
        JSON.stringify(updatedChangelog),
        publishedAt,
      ]
    );

    await conn.query(
      `INSERT INTO drill_versions (
        drill_id, version, status, changelog, compatible_machines_json,
        compatible_hardware_json, snapshot_json, published_at, created_by_user_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        changelog = VALUES(changelog),
        snapshot_json = VALUES(snapshot_json),
        published_at = COALESCE(VALUES(published_at), published_at)`,
      [
        drillId,
        finalVersion,
        finalStatus,
        changelogNote,
        JSON.stringify(marketplace.compatibleMachines || ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1']),
        JSON.stringify(marketplace.compatibleHardware || ['STA-UNO-R3', 'MOCK-DRIVER']),
        JSON.stringify(snapshot),
        publishedAt,
        authorUserId,
        authorName,
      ]
    );

    await conn.commit();

    if (finalStatus === 'PUBLISHED') {
      await recordDrillPublicationOnMotherPlatform(snapshot, req.correlationId).catch(() => null);
    }

    await logAuditEvent(
      existingDrill ? 'DRILL_UPDATE' : 'DRILL_CREATE',
      authorUserId,
      authorName,
      req.ip,
      `Treino '${title}' (${drillId}) salvo em v${finalVersion} [${finalStatus}]`,
      { entityType: 'DRILL', entityId: drillId, correlationId: req.correlationId }
    );

    res.status(existingDrill ? 200 : 201).json(snapshot);
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao salvar treino:', err);
    res.status(500).json({ error: 'Erro interno ao salvar treino no banco de dados' });
  } finally {
    conn.release();
  }
}

export const createDrill = saveOrUpsertDrill;
export const updateDrill = saveOrUpsertDrill;
export const saveDrill = saveOrUpsertDrill;

/**
 * POST / PATCH /drills/:id/status
 * Transição do ciclo de vida do treino: DRAFT -> REVIEW/IN_REVIEW -> PUBLISHED -> ARCHIVED (RF15, RF16, RF23)
 */
export async function updateDrillStatus(req: Request, res: Response): Promise<void> {
  const drillId = req.params.id;
  const targetStatus = req.body?.status as DrillLifecycleStatus;
  const versionBump = req.body?.versionBump as 'PATCH' | 'MINOR' | 'MAJOR' | undefined;
  const changelog = sanitizeOptionalText(req.body?.changelog || req.body?.notes, 600);

  const validStatuses: DrillLifecycleStatus[] = [
    'DRAFT',
    'REVIEW',
    'IN_REVIEW',
    'PUBLISHED',
    'ARCHIVED',
  ];
  if (!validStatuses.includes(targetStatus)) {
    res.status(400).json({
      error: 'Status de ciclo de vida inválido (use DRAFT, REVIEW, IN_REVIEW, PUBLISHED ou ARCHIVED)',
    });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    if (rows.length === 0) {
      await conn.rollback();
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

    const row = rows[0];
    const drillObj = mapRowToDrill(row);

    // Validação formal obrigatória antes de publicar (RF15, RF16)
    if (targetStatus === 'PUBLISHED') {
      const validation = validateDrillDefinition(drillObj);
      if (!validation.valid) {
        await conn.rollback();
        res.status(400).json({
          error: `Publicação bloqueada pela validação de segurança/regras: ${validation.errors[0]}`,
          validation,
        });
        return;
      }
    }

    const nextVersion = versionBump
      ? bumpDrillVersion(drillObj.version, versionBump)
      : drillObj.version;

    const publishedAt = targetStatus === 'PUBLISHED' ? new Date() : row.published_at;
    drillObj.version = nextVersion;
    drillObj.status = targetStatus;
    drillObj.publishedAt = publishedAt ? new Date(publishedAt).toISOString() : null;

    const updatedChangelog = [
      {
        version: nextVersion,
        date: new Date().toISOString().split('T')[0],
        author: req.user?.name || drillObj.authorName,
        notes: changelog || `Status alterado para ${targetStatus}`,
      },
      ...(drillObj.changelog || []),
    ];
    drillObj.changelog = updatedChangelog;

    await conn.query(
      'UPDATE drills SET status = ?, current_version = ?, changelog_json = ?, published_at = ? WHERE id = ?',
      [targetStatus, nextVersion, JSON.stringify(updatedChangelog), publishedAt, drillId]
    );

    await conn.query(
      `INSERT INTO drill_versions (
        drill_id, version, status, changelog, compatible_machines_json,
        compatible_hardware_json, snapshot_json, published_at, created_by_user_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        published_at = VALUES(published_at),
        changelog = COALESCE(?, changelog),
        snapshot_json = VALUES(snapshot_json)`,
      [
        drillId,
        nextVersion,
        targetStatus,
        changelog || `Status alterado para ${targetStatus}`,
        JSON.stringify(drillObj.marketplace?.compatibleMachines || ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1']),
        JSON.stringify(drillObj.marketplace?.compatibleHardware || ['STA-UNO-R3', 'MOCK-DRIVER']),
        JSON.stringify(drillObj),
        publishedAt,
        req.user?.id ?? drillObj.authorUserId ?? null,
        req.user?.name || drillObj.authorName,
        changelog ?? null,
      ]
    );

    await conn.commit();

    let motherReceiptId: string | null = null;
    if (targetStatus === 'PUBLISHED') {
      motherReceiptId = await recordDrillPublicationOnMotherPlatform(drillObj, req.correlationId);
    }

    await logAuditEvent(
      targetStatus === 'PUBLISHED' ? 'DRILL_PUBLISH' : 'DRILL_STATUS_CHANGE',
      req.user?.id || null,
      req.user?.name || drillObj.authorName,
      req.ip,
      `Status do treino '${drillObj.title}' (${drillId} v${drillObj.version}) alterado para ${targetStatus}${
        motherReceiptId ? ` [Recibo Plataforma Mãe: ${motherReceiptId}]` : ''
      }`,
      {
        entityType: 'DRILL',
        entityId: drillId,
        correlationId: req.correlationId,
      }
    );

    res.json({
      ...drillObj,
      drill: drillObj,
      motherPlatformReceiptId: motherReceiptId,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao alterar status do treino:', err);
    res.status(500).json({ error: 'Erro interno ao alterar status do treino' });
  } finally {
    conn.release();
  }
}

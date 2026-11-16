import { Request, Response } from 'express';
<<<<<<< HEAD
import { pool, logAuditEvent } from '../db';
import {
  DrillDefinition,
  DrillCategory,
  DrillDifficulty,
  DrillStatus,
  validateDrillDefinition,
  bumpDrillVersion,
} from '../../../packages/shared/src/contracts/drills';

function mapRowToDrill(r: any): DrillDefinition {
  let steps = [];
  let preparation = undefined;
  let marketplace = undefined;
  let changelog = undefined;

  try {
    steps = typeof r.steps_json === 'string' ? JSON.parse(r.steps_json) : r.steps_json || [];
  } catch {}
  try {
    preparation = r.preparation_json
      ? typeof r.preparation_json === 'string'
        ? JSON.parse(r.preparation_json)
        : r.preparation_json
      : undefined;
  } catch {}
  try {
    marketplace = r.marketplace_json
      ? typeof r.marketplace_json === 'string'
        ? JSON.parse(r.marketplace_json)
        : r.marketplace_json
      : undefined;
  } catch {}
  try {
    changelog = r.changelog_json
      ? typeof r.changelog_json === 'string'
        ? JSON.parse(r.changelog_json)
        : r.changelog_json
      : undefined;
  } catch {}

=======
import crypto from 'crypto';
import { pool, logAuditEvent } from '../db';
import {
  CreateOrUpdateDrillDto,
  DrillDefinition,
  DrillLifecycleStatus,
  DrillVersionRecord,
  validateDrillDefinition,
} from '../../../packages/shared/src/contracts/drills';
import { sanitizeOptionalText } from '../../../packages/shared/src/security/validation';
import { recordDrillPublicationOnMotherPlatform } from '../services/motherPlatformService';

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToDrill(r: any): DrillDefinition {
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  return {
    id: r.id,
    title: r.title,
    description: r.description,
<<<<<<< HEAD
    category: (r.category as DrillCategory) || DrillCategory.PRECISION,
    difficulty: (Number(r.difficulty) as DrillDifficulty) || DrillDifficulty.INTERMEDIATE,
    recommendedAgeMin: r.recommended_age_min ?? undefined,
    recommendedAgeMax: r.recommended_age_max ?? undefined,
    isKidsAdapted: Boolean(r.is_kids_adapted),
    version: r.version || '1.0.0',
    authorName: r.author_name || 'Comissão Técnica Arena',
    authorId: r.author_id ?? undefined,
    status: (r.status as DrillStatus) || 'PUBLISHED',
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    steps,
    preparation,
    marketplace,
    changelog,
  };
}

/**
 * GET /api/drills — Consulta e filtragem de treinos (RF03, RF18)
 */
export async function listDrills(req: Request, res: Response): Promise<void> {
  try {
    const { category, difficulty, isKids, status, q } = req.query;

    let sql = 'SELECT * FROM drills WHERE 1=1';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(Number(difficulty));
    }
    if (isKids !== undefined) {
      sql += ' AND is_kids_adapted = ?';
      params.push(isKids === 'true' || isKids === '1' ? 1 : 0);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR author_name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY updated_at DESC';

    const [rows] = await pool.query<any[]>(sql, params);
    const drills = rows.map(mapRowToDrill);
    res.json(drills);
  } catch (err: any) {
=======
    category: r.category,
    difficulty: Number(r.difficulty),
    recommendedAgeMin: r.recommended_age_min ?? undefined,
    recommendedAgeMax: r.recommended_age_max ?? undefined,
    isKidsAdapted: Boolean(r.is_kids_adapted),
    version: r.current_version,
    authorName: r.author_name,
    authorUserId: r.author_user_id ?? null,
    status: r.status,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    targetAudience: r.target_audience || 'TODOS',
    objective: r.objective || r.description,
    estimatedDurationSec: Number(r.estimated_duration_sec || 30),
    requiredSensors: safeJsonParse(r.required_sensors_json, ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP']),
    scoringRules: safeJsonParse(r.scoring_rules_json, undefined),
    preparation: safeJsonParse(r.preparation_json, undefined),
    marketplace: safeJsonParse(r.marketplace_json, undefined),
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

function bumpPatchVersion(version: string): string {
  const parts = version.split('.').map((n) => parseInt(n, 10));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return '1.0.1';
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
      isKidsAdapted,
      maxDurationSec,
      sensor,
      status,
      search,
      authorId,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    // Controle de visibilidade do ciclo de vida (RF16):
    // Visitantes e Jogadores veem apenas treinos PUBLICADOS.
    // Treinadores veem PUBLICADOS + seus próprios rascunhos/em revisão. ADMIN vê tudo.
    if (!requesterRole || requesterRole === 'JOGADOR') {
      conditions.push("status = 'PUBLISHED'");
    } else if (requesterRole === 'TREINADOR') {
      if (status && typeof status === 'string') {
        conditions.push('status = ? AND (status = \'PUBLISHED\' OR author_user_id = ?)');
        params.push(status, requesterId);
      } else {
        conditions.push("(status = 'PUBLISHED' OR author_user_id = ?)");
        params.push(requesterId);
      }
    } else if (requesterRole === 'ADMIN' && status && typeof status === 'string') {
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

    if (isKidsAdapted === 'true' || isKidsAdapted === 'false') {
      conditions.push('is_kids_adapted = ?');
      params.push(isKidsAdapted === 'true' ? 1 : 0);
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

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      conditions.push('(title LIKE ? OR description LIKE ? OR objective LIKE ?)');
      params.push(q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM drills ${whereClause} ORDER BY is_kids_adapted DESC, difficulty ASC, title ASC`,
      params
    );

    let drills = rows.map(mapRowToDrill);

    if (sensor && typeof sensor === 'string' && sensor.trim().length > 0) {
      const requiredSensor = sensor.trim();
      drills = drills.filter((d) => (d.requiredSensors || []).includes(requiredSensor as any));
    }

    res.json(drills);
  } catch (err) {
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
    console.error('Erro ao listar treinos:', err);
    res.status(500).json({ error: 'Erro interno ao consultar catálogo de treinos' });
  }
}

/**
<<<<<<< HEAD
 * GET /api/drills/:id — Detalhes completos e versões de um treino (RF04, RF16, RF18)
 */
export async function getDrillById(req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }
    res.json(mapRowToDrill(rows[0]));
  } catch (err: any) {
    console.error('Erro ao buscar treino:', err);
    res.status(500).json({ error: 'Erro interno ao buscar treino' });
=======
 * GET /drills/:id
 * Detalhes completos de um treino (RF04, RF18, RF20)
 */
export async function getDrillById(req: Request, res: Response): Promise<void> {
  try {
    const drillId = req.params.id;
    const [rows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

    const drill = mapRowToDrill(rows[0]);
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = req.user?.role === 'TREINADOR' && req.user.id === drill.authorUserId;

    if (drill.status !== 'PUBLISHED' && !isAdmin && !isOwner) {
      res.status(403).json({ error: 'Este treino ainda não está publicado para acesso público' });
      return;
    }

    res.json(drill);
  } catch (err) {
    console.error('Erro ao obter detalhes do treino:', err);
    res.status(500).json({ error: 'Erro interno ao consultar treino' });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  }
}

/**
<<<<<<< HEAD
 * POST /api/drills — Criação ou atualização de treino com validação formal (RF14, RF15, RF16, RF20)
 */
export async function saveDrill(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<DrillDefinition> & {
    bumpType?: 'PATCH' | 'MINOR' | 'MAJOR';
    changelogNote?: string;
  };
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

=======
 * GET /drills/:id/versions
 * Histórico completo de versões, status, compatibilidade e changelog do treino (RF16, RF18)
 */
export async function getDrillVersions(req: Request, res: Response): Promise<void> {
  try {
    const drillId = req.params.id;
    const [drillRows] = await pool.query<any[]>('SELECT id, status, author_user_id FROM drills WHERE id = ?', [drillId]);
    if (drillRows.length === 0) {
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

    const requesterRole = req.user?.role;
    const onlyPublished = !requesterRole || requesterRole === 'JOGADOR';

    const [rows] = await pool.query<any[]>(
      `SELECT * FROM drill_versions
       WHERE drill_id = ? ${onlyPublished ? "AND status = 'PUBLISHED'" : ''}
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
 * POST /drills
 * Criação de novo treino em rascunho por Treinador/Autor ou Admin (RF14, RF16, RF20)
 */
export async function createDrill(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateOrUpdateDrillDto;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  const validation = validateDrillDefinition(body);
  if (!validation.valid) {
    res.status(400).json({
      error: validation.errors[0],
      validation,
    });
    return;
  }

  const drillId =
<<<<<<< HEAD
    body.id && body.id.trim().length > 0
      ? body.id.trim()
      : `drill-custom-${Date.now().toString(36)}`;

  try {
    const [existingRows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    const existing = existingRows[0] ? mapRowToDrill(existingRows[0]) : null;

    const finalVersion =
      existing && body.bumpType
        ? bumpDrillVersion(existing.version, body.bumpType)
        : body.version || existing?.version || '1.0.0';

    const finalStatus: DrillStatus = body.status || existing?.status || 'DRAFT';
    const authorName = body.authorName || req.user?.name || 'Treinador Arena';
    const authorId = req.user?.id || existing?.authorId || null;

    const prevChangelog = existing?.changelog || body.changelog || [];
    const newChangelogEntry = {
      version: finalVersion,
      date: new Date().toISOString().split('T')[0],
      author: authorName,
      notes:
        body.changelogNote ||
        (existing ? `Atualização do protocolo (${finalStatus})` : 'Criação inicial do treino'),
    };
    const updatedChangelog = [newChangelogEntry, ...prevChangelog.slice(0, 14)];

    const preparation = body.preparation || {
      instructions: [
        'Posicione-se na marca central da linha de base antes da contagem regressiva.',
        'Acompanhe a sinalização luminosa dos LEDs nos 5 alvos piezoelétricos.',
      ],
      scoringRulesSummary: body.isKidsAdapted
        ? 'Modo Kids (RN09): +50% de janela temporal e isenção de penalidades.'
        : 'Modo Pro (RN03): Pontuação por tempo restante, multiplicador de streak (até 1.5x) e bônus de força ADC.',
      equipmentRequired: ['Raquete de Tênis', '5 Sensores Piezoelétricos + Controlador Serial'],
      safetyWarnings: ['Mantenha a área de cabos e alvos livre de obstáculos físicos.'],
      requiredSensors: validation.requiredSensors,
      estimatedDurationSec: validation.estimatedDurationSec,
    };

    const marketplace = body.marketplace || {
      commercialDescription: body.description || '',
      compatibility: 'Arduino Uno R3 + Simulador Spinshot',
      licenseType: 'FREE_OPEN',
      remunerationModel: 'FREE',
      suggestedPriceBrl: 0,
    };

    await pool.query(
      `INSERT INTO drills (
        id, title, description, category, difficulty,
        recommended_age_min, recommended_age_max, is_kids_adapted,
        version, status, author_id, author_name,
        steps_json, preparation_json, marketplace_json, changelog_json, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        category = VALUES(category),
        difficulty = VALUES(difficulty),
        recommended_age_min = VALUES(recommended_age_min),
        recommended_age_max = VALUES(recommended_age_max),
        is_kids_adapted = VALUES(is_kids_adapted),
        version = VALUES(version),
        status = VALUES(status),
        author_name = VALUES(author_name),
        steps_json = VALUES(steps_json),
        preparation_json = VALUES(preparation_json),
        marketplace_json = VALUES(marketplace_json),
        changelog_json = VALUES(changelog_json),
        published_at = COALESCE(VALUES(published_at), published_at)`,
      [
        drillId,
        body.title!.trim(),
        body.description!.trim(),
        body.category || DrillCategory.PRECISION,
        body.difficulty || DrillDifficulty.INTERMEDIATE,
        body.recommendedAgeMin ?? null,
        body.recommendedAgeMax ?? null,
        body.isKidsAdapted ? 1 : 0,
        finalVersion,
        finalStatus,
        authorId,
        authorName,
        JSON.stringify(body.steps),
        JSON.stringify(preparation),
        JSON.stringify(marketplace),
        JSON.stringify(updatedChangelog),
        finalStatus === 'PUBLISHED' ? new Date() : null,
      ]
    );

    await logAuditEvent(
      existing ? 'DRILL_UPDATE' : 'DRILL_CREATE',
      req.user?.id || null,
      authorName,
      ip,
      `Treino "${body.title}" (${drillId}) salvo em v${finalVersion} [${finalStatus}]`
    );

    const [savedRows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    res.status(existing ? 200 : 201).json(mapRowToDrill(savedRows[0]));
  } catch (err: any) {
    console.error('Erro ao salvar treino:', err);
    res.status(500).json({ error: 'Erro interno ao salvar treino no banco de dados' });
=======
    body.id && /^[a-z0-9-]{4,80}$/.test(body.id)
      ? body.id
      : slugifyDrillId(body.title);

  const version = body.version && /^\d+\.\d+\.\d+$/.test(body.version) ? body.version : '1.0.0';
  const title = sanitizeOptionalText(body.title, 150) || body.title.trim();
  const description = sanitizeOptionalText(body.description, 1500) || body.description.trim();
  const objective = sanitizeOptionalText(body.objective, 1000) || description;
  const changelog = sanitizeOptionalText(body.changelog, 600) || 'Criação inicial do rascunho.';
  const estimatedDurationSec = body.estimatedDurationSec || validation.computedDurationSec;
  const requiredSensors =
    Array.isArray(body.requiredSensors) && body.requiredSensors.length > 0
      ? body.requiredSensors
      : ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP', 'BALL_MACHINE_SIM'];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query<any[]>('SELECT id FROM drills WHERE id = ?', [drillId]);
    if (existing.length > 0) {
      await conn.rollback();
      res.status(409).json({ error: `Já existe um treino com o identificador '${drillId}'` });
      return;
    }

    const normalizedSteps = body.steps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));

    const snapshot: DrillDefinition = {
      id: drillId,
      title,
      description,
      category: body.category,
      difficulty: body.difficulty,
      recommendedAgeMin: body.recommendedAgeMin,
      recommendedAgeMax: body.recommendedAgeMax,
      isKidsAdapted: Boolean(body.isKidsAdapted),
      version,
      authorName: req.user!.name,
      authorUserId: req.user!.id,
      status: 'DRAFT',
      publishedAt: null,
      targetAudience: body.targetAudience || (body.isKidsAdapted ? 'KIDS' : 'TODOS'),
      objective,
      estimatedDurationSec,
      requiredSensors: requiredSensors as any,
      scoringRules: body.scoringRules,
      preparation: body.preparation,
      marketplace: body.marketplace,
      steps: normalizedSteps,
    };

    await conn.query(
      `INSERT INTO drills (
        id, title, description, category, difficulty, target_audience, objective,
        estimated_duration_sec, recommended_age_min, recommended_age_max, is_kids_adapted,
        current_version, status, author_user_id, author_name, required_sensors_json,
        steps_json, scoring_rules_json, preparation_json, marketplace_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)`,
      [
        drillId,
        title,
        description,
        body.category,
        body.difficulty,
        snapshot.targetAudience,
        objective,
        estimatedDurationSec,
        body.recommendedAgeMin ?? null,
        body.recommendedAgeMax ?? null,
        body.isKidsAdapted ? 1 : 0,
        version,
        req.user!.id,
        req.user!.name,
        JSON.stringify(requiredSensors),
        JSON.stringify(normalizedSteps),
        JSON.stringify(body.scoringRules || null),
        JSON.stringify(body.preparation || null),
        JSON.stringify(body.marketplace || null),
      ]
    );

    await conn.query(
      `INSERT INTO drill_versions (
        drill_id, version, status, changelog, compatible_machines_json,
        compatible_hardware_json, snapshot_json, created_by_user_id, created_by_name
      ) VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
      [
        drillId,
        version,
        changelog,
        JSON.stringify(body.marketplace?.compatibleMachines || ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1']),
        JSON.stringify(body.marketplace?.compatibleHardware || ['STA-UNO-R3', 'MOCK-DRIVER']),
        JSON.stringify(snapshot),
        req.user!.id,
        req.user!.name,
      ]
    );

    await conn.commit();

    await logAuditEvent(
      'DRILL_CREATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Treino '${title}' (${drillId} v${version}) criado em DRAFT`,
      { entityType: 'DRILL', entityId: drillId, correlationId: req.correlationId }
    );

    res.status(201).json(snapshot);
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao criar treino:', err);
    res.status(500).json({ error: 'Erro interno ao criar treino' });
  } finally {
    conn.release();
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  }
}

/**
<<<<<<< HEAD
 * PATCH /api/drills/:id/status — Publicação e controle de revisão de treino (RF16, RF23)
 */
export async function updateDrillStatus(req: Request, res: Response): Promise<void> {
  const drillId = req.params.id;
  const { status, versionBump, notes } = req.body as {
    status: DrillStatus;
    versionBump?: 'PATCH' | 'MINOR' | 'MAJOR';
    notes?: string;
  };
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    res.status(400).json({ error: 'Status de publicação inválido' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    if (!rows[0]) {
=======
 * PUT /drills/:id
 * Edição de treino com controle de autoria e geração automática de nova versão/changelog (RF14, RF16, RF20)
 */
export async function updateDrill(req: Request, res: Response): Promise<void> {
  const drillId = req.params.id;
  const body = req.body as CreateOrUpdateDrillDto;

  const validation = validateDrillDefinition(body);
  if (!validation.valid) {
    res.status(400).json({
      error: validation.errors[0],
      validation,
    });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    if (rows.length === 0) {
      await conn.rollback();
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

<<<<<<< HEAD
    const current = mapRowToDrill(rows[0]);
    const nextVersion = versionBump
      ? bumpDrillVersion(current.version, versionBump)
      : current.version;

    const changelog = [
      {
        version: nextVersion,
        date: new Date().toISOString().split('T')[0],
        author: req.user?.name || current.authorName,
        notes: notes || `Status alterado para ${status}`,
      },
      ...(current.changelog || []),
    ];

    await pool.query(
      `UPDATE drills
       SET status = ?, version = ?, changelog_json = ?,
           published_at = CASE WHEN ? = 'PUBLISHED' THEN NOW() ELSE published_at END
       WHERE id = ?`,
      [status, nextVersion, JSON.stringify(changelog), status, drillId]
    );

    await logAuditEvent(
      status === 'PUBLISHED' ? 'DRILL_PUBLISH' : 'DRILL_STATUS_CHANGE',
      req.user?.id || null,
      req.user?.name || current.authorName,
      ip,
      `Treino "${current.title}" (${drillId}) -> ${status} (v${nextVersion})`
    );

    const [updatedRows] = await pool.query<any[]>('SELECT * FROM drills WHERE id = ?', [drillId]);
    res.json(mapRowToDrill(updatedRows[0]));
  } catch (err: any) {
    console.error('Erro ao publicar treino:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar status do treino' });
  }
}
=======
    const existingRow = rows[0];
    if (req.user!.role !== 'ADMIN' && existingRow.author_user_id !== req.user!.id) {
      await conn.rollback();
      res.status(403).json({ error: 'Apenas o autor do treino ou um Administrador pode editá-lo' });
      return;
    }

    const nextVersion =
      body.version && /^\d+\.\d+\.\d+$/.test(body.version) && body.version !== existingRow.current_version
        ? body.version
        : bumpPatchVersion(existingRow.current_version);

    const title = sanitizeOptionalText(body.title, 150) || body.title.trim();
    const description = sanitizeOptionalText(body.description, 1500) || body.description.trim();
    const objective = sanitizeOptionalText(body.objective, 1000) || description;
    const changelog =
      sanitizeOptionalText(body.changelog, 600) || `Atualização para versão ${nextVersion}.`;
    const estimatedDurationSec = body.estimatedDurationSec || validation.computedDurationSec;
    const requiredSensors =
      Array.isArray(body.requiredSensors) && body.requiredSensors.length > 0
        ? body.requiredSensors
        : safeJsonParse(existingRow.required_sensors_json, ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP']);

    // Quando um treino publicado é editado, mantém status ou volta para DRAFT caso solicitado
    const nextStatus: DrillLifecycleStatus =
      existingRow.status === 'ARCHIVED' ? 'DRAFT' : existingRow.status;

    const normalizedSteps = body.steps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));

    const snapshot: DrillDefinition = {
      id: drillId,
      title,
      description,
      category: body.category,
      difficulty: body.difficulty,
      recommendedAgeMin: body.recommendedAgeMin,
      recommendedAgeMax: body.recommendedAgeMax,
      isKidsAdapted: Boolean(body.isKidsAdapted),
      version: nextVersion,
      authorName: existingRow.author_name,
      authorUserId: existingRow.author_user_id,
      status: nextStatus,
      publishedAt: existingRow.published_at ? new Date(existingRow.published_at).toISOString() : null,
      targetAudience: body.targetAudience || existingRow.target_audience || 'TODOS',
      objective,
      estimatedDurationSec,
      requiredSensors: requiredSensors as any,
      scoringRules: body.scoringRules,
      preparation: body.preparation,
      marketplace: body.marketplace,
      steps: normalizedSteps,
    };

    await conn.query(
      `UPDATE drills
       SET title = ?, description = ?, category = ?, difficulty = ?, target_audience = ?,
           objective = ?, estimated_duration_sec = ?, recommended_age_min = ?, recommended_age_max = ?,
           is_kids_adapted = ?, current_version = ?, status = ?, required_sensors_json = ?,
           steps_json = ?, scoring_rules_json = ?, preparation_json = ?, marketplace_json = ?
       WHERE id = ?`,
      [
        title,
        description,
        body.category,
        body.difficulty,
        snapshot.targetAudience,
        objective,
        estimatedDurationSec,
        body.recommendedAgeMin ?? null,
        body.recommendedAgeMax ?? null,
        body.isKidsAdapted ? 1 : 0,
        nextVersion,
        nextStatus,
        JSON.stringify(requiredSensors),
        JSON.stringify(normalizedSteps),
        JSON.stringify(body.scoringRules || null),
        JSON.stringify(body.preparation || null),
        JSON.stringify(body.marketplace || null),
        drillId,
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
        snapshot_json = VALUES(snapshot_json)`,
      [
        drillId,
        nextVersion,
        nextStatus,
        changelog,
        JSON.stringify(body.marketplace?.compatibleMachines || ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1']),
        JSON.stringify(body.marketplace?.compatibleHardware || ['STA-UNO-R3', 'MOCK-DRIVER']),
        JSON.stringify(snapshot),
        nextStatus === 'PUBLISHED' ? new Date() : null,
        req.user!.id,
        req.user!.name,
      ]
    );

    await conn.commit();

    await logAuditEvent(
      'DRILL_UPDATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Treino '${title}' (${drillId}) atualizado para v${nextVersion} — ${changelog}`,
      { entityType: 'DRILL', entityId: drillId, correlationId: req.correlationId }
    );

    res.json(snapshot);
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao atualizar treino:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar treino' });
  } finally {
    conn.release();
  }
}

/**
 * POST /drills/:id/status
 * Transição do ciclo de vida do treino: DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED (RF15, RF16, RF23)
 */
export async function updateDrillStatus(req: Request, res: Response): Promise<void> {
  const drillId = req.params.id;
  const targetStatus = req.body?.status as DrillLifecycleStatus;
  const changelog = sanitizeOptionalText(req.body?.changelog, 600);

  const validStatuses: DrillLifecycleStatus[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'];
  if (!validStatuses.includes(targetStatus)) {
    res.status(400).json({ error: 'Status de ciclo de vida inválido (use DRAFT, IN_REVIEW, PUBLISHED ou ARCHIVED)' });
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
    if (req.user!.role !== 'ADMIN' && row.author_user_id !== req.user!.id) {
      await conn.rollback();
      res.status(403).json({ error: 'Sem permissão para alterar o status deste treino' });
      return;
    }

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

    const publishedAt = targetStatus === 'PUBLISHED' ? new Date() : row.published_at;
    drillObj.status = targetStatus;
    drillObj.publishedAt = publishedAt ? new Date(publishedAt).toISOString() : null;

    await conn.query(
      'UPDATE drills SET status = ?, published_at = ? WHERE id = ?',
      [targetStatus, publishedAt, drillId]
    );

    await conn.query(
      `UPDATE drill_versions
       SET status = ?,
           published_at = ?,
           changelog = COALESCE(?, changelog),
           snapshot_json = ?
       WHERE drill_id = ? AND version = ?`,
      [
        targetStatus,
        publishedAt,
        changelog ?? null,
        JSON.stringify(drillObj),
        drillId,
        drillObj.version,
      ]
    );

    await conn.commit();

    let motherReceiptId: string | null = null;
    if (targetStatus === 'PUBLISHED') {
      motherReceiptId = await recordDrillPublicationOnMotherPlatform(drillObj, req.correlationId);
    }

    await logAuditEvent(
      targetStatus === 'PUBLISHED' ? 'DRILL_PUBLISH' : 'DRILL_STATUS_CHANGE',
      req.user!.id,
      req.user!.name,
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

>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

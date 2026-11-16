import { Request, Response } from 'express';
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

  return {
    id: r.id,
    title: r.title,
    description: r.description,
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
    console.error('Erro ao listar treinos:', err);
    res.status(500).json({ error: 'Erro interno ao consultar catálogo de treinos' });
  }
}

/**
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
  }
}

/**
 * POST /api/drills — Criação ou atualização de treino com validação formal (RF14, RF15, RF16, RF20)
 */
export async function saveDrill(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<DrillDefinition> & {
    bumpType?: 'PATCH' | 'MINOR' | 'MAJOR';
    changelogNote?: string;
  };
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const validation = validateDrillDefinition(body);
  if (!validation.valid) {
    res.status(400).json({
      error: validation.errors[0],
      validation,
    });
    return;
  }

  const drillId =
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
  }
}

/**
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
      res.status(404).json({ error: 'Treino não encontrado' });
      return;
    }

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

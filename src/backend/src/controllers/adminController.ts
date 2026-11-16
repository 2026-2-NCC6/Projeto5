import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { pool, logAuditEvent } from '../db';
import {
  CategoryRecord,
  IoTDeviceRecord,
  PairIoTDeviceDto,
  SystemSettingRecord,
} from '../../../packages/shared/src/contracts/admin';
import { sanitizeOptionalText } from '../../../packages/shared/src/security/validation';

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapCategory(r: any): CategoryRecord {
  return {
    id: r.id,
    slug: r.slug,
    code: r.code,
    name: r.name,
    description: r.description,
    targetAudience: r.target_audience,
    active: Boolean(r.is_active),
    displayOrder: Number(r.display_order),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapDevice(r: any): IoTDeviceRecord {
  return {
    id: r.id,
    deviceCode: r.device_code,
    name: r.name,
    hardwareModel: r.hardware_model,
    firmwareVersion: r.firmware_version,
    transportType: r.transport_type,
    status: r.status,
    piezoThresholds: safeJsonParse(r.piezo_thresholds_json, [250, 250, 250, 250, 250]),
    sensorHealth: safeJsonParse(r.sensor_health_json, {}),
    lastSeenAt: r.last_seen_at ? new Date(r.last_seen_at).toISOString() : null,
    pairedByUserId: r.paired_by_user_id ?? null,
    active: Boolean(r.is_active),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// =========================================================================
// CATEGORIAS DE TREINO (RF17, RF20)
// =========================================================================

export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    );
    res.json(rows.map(mapCategory));
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro interno ao consultar categorias' });
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { slug, code, name, description, targetAudience, displayOrder } = req.body || {};
  if (!name || !code || !slug) {
    res.status(400).json({ error: 'Campos slug, code e name são obrigatórios' });
    return;
  }

  try {
    const [ins] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO categories (slug, code, name, description, target_audience, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(slug).trim().toLowerCase(),
        String(code).trim().toUpperCase(),
        sanitizeOptionalText(name, 120) || String(name).trim(),
        sanitizeOptionalText(description, 500) || '',
        sanitizeOptionalText(targetAudience, 40) || 'TODOS',
        Number(displayOrder || 0),
      ]
    );

    await logAuditEvent(
      'ADMIN_CATEGORY_CREATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Categoria '${name}' (${code}) cadastrada`,
      { entityType: 'CATEGORY', entityId: ins.insertId, correlationId: req.correlationId }
    );

    const [rows] = await pool.query<any[]>('SELECT * FROM categories WHERE id = ?', [ins.insertId]);
    res.status(201).json(mapCategory(rows[0]));
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Já existe uma categoria com este código ou slug' });
      return;
    }
    console.error('Erro ao criar categoria:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar categoria' });
  }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const { name, description, targetAudience, active, displayOrder } = req.body || {};

  try {
    const [existing] = await pool.query<any[]>('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }

    const row = existing[0];
    await pool.query(
      `UPDATE categories
       SET name = ?, description = ?, target_audience = ?, is_active = ?, display_order = ?
       WHERE id = ?`,
      [
        name !== undefined ? sanitizeOptionalText(name, 120) || row.name : row.name,
        description !== undefined ? sanitizeOptionalText(description, 500) ?? '' : row.description,
        targetAudience !== undefined ? sanitizeOptionalText(targetAudience, 40) || row.target_audience : row.target_audience,
        typeof active === 'boolean' ? (active ? 1 : 0) : row.is_active,
        displayOrder !== undefined ? Number(displayOrder) : row.display_order,
        id,
      ]
    );

    await logAuditEvent(
      'ADMIN_CATEGORY_UPDATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Categoria #${id} atualizada`,
      { entityType: 'CATEGORY', entityId: id, correlationId: req.correlationId }
    );

    const [updated] = await pool.query<any[]>('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(mapCategory(updated[0]));
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar categoria' });
  }
}

// =========================================================================
// DISPOSITIVOS IoT E PAREAMENTO AUTORIZADO (RF05, RF17, Cibersegurança IoT)
// =========================================================================

export async function listDevices(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM iot_devices ORDER BY id ASC');
    res.json(rows.map(mapDevice));
  } catch (err) {
    console.error('Erro ao listar dispositivos IoT:', err);
    res.status(500).json({ error: 'Erro interno ao consultar dispositivos IoT' });
  }
}

export async function registerDevice(req: Request, res: Response): Promise<void> {
  const { deviceCode, name, hardwareModel, firmwareVersion, transportType, pairingToken } = req.body || {};
  if (!deviceCode || !name || !hardwareModel) {
    res.status(400).json({ error: 'Campos deviceCode, name e hardwareModel são obrigatórios' });
    return;
  }

  const plainToken =
    typeof pairingToken === 'string' && pairingToken.trim().length >= 12
      ? pairingToken.trim()
      : `sta-iot-${crypto.randomUUID()}`;

  try {
    const tokenHash = await bcrypt.hash(plainToken, 10);
    const [ins] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO iot_devices (
        device_code, name, hardware_model, firmware_version, transport_type,
        auth_token_hash, status, piezo_thresholds_json, sensor_health_json
      ) VALUES (?, ?, ?, ?, ?, ?, 'OFFLINE', ?, ?)`,
      [
        String(deviceCode).trim().toUpperCase(),
        sanitizeOptionalText(name, 150) || String(name).trim(),
        sanitizeOptionalText(hardwareModel, 80) || String(hardwareModel).trim(),
        sanitizeOptionalText(firmwareVersion, 40) || '1.0.0',
        ['USB_SERIAL', 'WIFI_WS', 'BLE', 'SIMULATOR'].includes(transportType)
          ? transportType
          : 'USB_SERIAL',
        tokenHash,
        JSON.stringify([250, 250, 250, 250, 250]),
        JSON.stringify({ piezo1: 'OK', piezo2: 'OK', piezo3: 'OK', piezo4: 'OK', piezo5: 'OK' }),
      ]
    );

    await logAuditEvent(
      'ADMIN_IOT_DEVICE_CREATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Controlador IoT '${deviceCode}' registrado com chave protegida por hash`,
      { entityType: 'IOT_DEVICE', entityId: deviceCode, correlationId: req.correlationId }
    );

    const [rows] = await pool.query<any[]>('SELECT * FROM iot_devices WHERE id = ?', [ins.insertId]);
    res.status(201).json({
      device: mapDevice(rows[0]),
      pairingTokenOnce: plainToken,
    });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Já existe um controlador IoT com este código' });
      return;
    }
    console.error('Erro ao registrar dispositivo IoT:', err);
    res.status(500).json({ error: 'Erro interno ao registrar dispositivo IoT' });
  }
}

export async function updateDevice(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'ID de dispositivo inválido' });
    return;
  }

  const { name, status, piezoThresholds, active, firmwareVersion } = req.body || {};

  try {
    const [existing] = await pool.query<any[]>('SELECT * FROM iot_devices WHERE id = ?', [id]);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Dispositivo IoT não encontrado' });
      return;
    }

    const row = existing[0];
    const nextStatus = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'FAULT'].includes(status)
      ? status
      : row.status;
    const nextThresholds =
      Array.isArray(piezoThresholds) && piezoThresholds.length === 5
        ? JSON.stringify(piezoThresholds.map((v) => Math.max(50, Math.min(1000, Number(v) || 250))))
        : row.piezo_thresholds_json;

    await pool.query(
      `UPDATE iot_devices
       SET name = ?, status = ?, piezo_thresholds_json = ?, firmware_version = ?, is_active = ?
       WHERE id = ?`,
      [
        name !== undefined ? sanitizeOptionalText(name, 150) || row.name : row.name,
        nextStatus,
        nextThresholds,
        firmwareVersion !== undefined
          ? sanitizeOptionalText(firmwareVersion, 40) || row.firmware_version
          : row.firmware_version,
        typeof active === 'boolean' ? (active ? 1 : 0) : row.is_active,
        id,
      ]
    );

    await logAuditEvent(
      'ADMIN_IOT_DEVICE_UPDATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Controlador IoT '${row.device_code}' atualizado (Status: ${nextStatus})`,
      { entityType: 'IOT_DEVICE', entityId: row.device_code, correlationId: req.correlationId }
    );

    const [updated] = await pool.query<any[]>('SELECT * FROM iot_devices WHERE id = ?', [id]);
    res.json(mapDevice(updated[0]));
  } catch (err) {
    console.error('Erro ao atualizar dispositivo IoT:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar dispositivo IoT' });
  }
}

/**
 * POST /devices/pair
 * Autentica pareamento autorizado entre aplicativo/host e controlador IoT via token protegido (RF05, Seção 5)
 */
export async function pairDevice(req: Request, res: Response): Promise<void> {
  const body = req.body as PairIoTDeviceDto;
  if (!body?.deviceCode || !body?.pairingToken) {
    res.status(400).json({ error: 'Informe o código do dispositivo (deviceCode) e o token de pareamento (pairingToken)' });
    return;
  }

  try {
    const code = String(body.deviceCode).trim().toUpperCase();
    const [rows] = await pool.query<any[]>('SELECT * FROM iot_devices WHERE device_code = ?', [
      code,
    ]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Controlador IoT não cadastrado na Arena' });
      return;
    }

    const row = rows[0];
    if (!row.is_active) {
      res.status(403).json({ error: 'Este controlador IoT está desativado administrativamente' });
      return;
    }

    const validToken = await bcrypt.compare(String(body.pairingToken), row.auth_token_hash);
    if (!validToken) {
      await logAuditEvent(
        'IOT_PAIRING_REJECTED',
        req.user?.id ?? null,
        req.user?.name ?? null,
        req.ip,
        `Tentativa de pareamento IoT com token inválido para '${code}'`,
        { severity: 'WARN', entityType: 'IOT_DEVICE', entityId: code, correlationId: req.correlationId }
      );
      res.status(401).json({ error: 'Token de pareamento IoT inválido' });
      return;
    }

    const nextThresholds =
      Array.isArray(body.piezoThresholds) && body.piezoThresholds.length === 5
        ? JSON.stringify(body.piezoThresholds)
        : row.piezo_thresholds_json;

    const nextHealth =
      body.sensorHealth && typeof body.sensorHealth === 'object'
        ? JSON.stringify(body.sensorHealth)
        : row.sensor_health_json;

    await pool.query(
      `UPDATE iot_devices
       SET status = 'ONLINE',
           last_seen_at = NOW(),
           paired_by_user_id = COALESCE(?, paired_by_user_id),
           firmware_version = COALESCE(?, firmware_version),
           piezo_thresholds_json = ?,
           sensor_health_json = ?
       WHERE id = ?`,
      [
        req.user?.id ?? null,
        body.firmwareVersion ? sanitizeOptionalText(body.firmwareVersion, 40) : null,
        nextThresholds,
        nextHealth,
        row.id,
      ]
    );

    await logAuditEvent(
      'IOT_DEVICE_PAIRED',
      req.user?.id ?? null,
      req.user?.name ?? 'Host Local',
      req.ip,
      `Controlador IoT '${code}' autenticado e online`,
      { entityType: 'IOT_DEVICE', entityId: code, correlationId: req.correlationId }
    );

    const [updated] = await pool.query<any[]>('SELECT * FROM iot_devices WHERE id = ?', [row.id]);
    res.json({
      authorized: true,
      device: mapDevice(updated[0]),
    });
  } catch (err) {
    console.error('Erro no pareamento IoT:', err);
    res.status(500).json({ error: 'Erro interno ao validar pareamento do dispositivo IoT' });
  }
}

// =========================================================================
// PARÂMETROS GERAIS DO SISTEMA (RF17)
// =========================================================================

export async function listSystemSettings(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM system_settings ORDER BY setting_key ASC'
    );
    const settings: SystemSettingRecord[] = rows.map((r) => ({
      settingKey: r.setting_key,
      settingValue: r.setting_value,
      valueType: r.value_type,
      description: r.description,
      updatedByUserId: r.updated_by_user_id ?? null,
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
    res.json(settings);
  } catch (err) {
    console.error('Erro ao consultar parâmetros do sistema:', err);
    res.status(500).json({ error: 'Erro interno ao consultar configurações do sistema' });
  }
}

export async function updateSystemSetting(req: Request, res: Response): Promise<void> {
  const key = req.params.key;
  const { value } = req.body || {};
  if (value === undefined || value === null) {
    res.status(400).json({ error: 'Informe o novo valor (value) do parâmetro' });
    return;
  }

  try {
    const [existing] = await pool.query<any[]>(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [key]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: `Parâmetro '${key}' não encontrado` });
      return;
    }

    const strVal = String(value).trim();
    await pool.query(
      'UPDATE system_settings SET setting_value = ?, updated_by_user_id = ? WHERE setting_key = ?',
      [strVal, req.user!.id, key]
    );

    await logAuditEvent(
      'SYSTEM_SETTING_UPDATE',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Parâmetro '${key}' alterado de '${existing[0].setting_value}' para '${strVal}'`,
      { entityType: 'SYSTEM_SETTING', entityId: key, correlationId: req.correlationId }
    );

    const [updated] = await pool.query<any[]>(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [key]
    );
    const r = updated[0];
    res.json({
      settingKey: r.setting_key,
      settingValue: r.setting_value,
      valueType: r.value_type,
      description: r.description,
      updatedByUserId: r.updated_by_user_id ?? null,
      updatedAt: new Date(r.updated_at).toISOString(),
    });
  } catch (err) {
    console.error('Erro ao atualizar parâmetro do sistema:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar configuração do sistema' });
  }
}


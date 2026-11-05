import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { DEFAULT_DRILLS } from '../../packages/shared/src/contracts/drills';

// Conexão inicial para garantir a existência do banco de dados
export async function ensureDatabaseExists(): Promise<void> {
  if (config.db.url) return;

  const adminConnection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } finally {
    await adminConnection.end();
  }
}

// Pool principal de conexões
export const pool = mysql.createPool(
  config.db.url
    ? { uri: config.db.url, waitForConnections: true, connectionLimit: 10, queueLimit: 0 }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      }
);

async function ensureColumnExists(
  conn: mysql.PoolConnection,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const [cols] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (cols.length === 0) {
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
  }
}

// Criação e migração idempotente de todas as tabelas do ecossistema
export async function initDatabase(): Promise<void> {
  await ensureDatabaseExists();

  const conn = await pool.getConnection();
  try {
    // 1. Tabela de Usuários (RF01, RF17)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('JOGADOR', 'TREINADOR', 'ADMIN') NOT NULL DEFAULT 'JOGADOR',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tabela de Perfil do Praticante (RF02 + Proteção LGPD de Menores - Seções 3 e 5)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        skill_level ENUM('INICIANTE', 'INTERMEDIARIO', 'AVANCADO') NOT NULL DEFAULT 'INICIANTE',
        age_group ENUM('KIDS', 'ADULTO') NOT NULL DEFAULT 'ADULTO',
        training_goals TEXT NULL,
        preferences TEXT NULL,
        physical_restrictions TEXT NULL,
        guardian_name VARCHAR(150) NULL,
        guardian_consent TINYINT(1) NOT NULL DEFAULT 0,
        telemetry_consent TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await ensureColumnExists(conn, 'player_profiles', 'guardian_name', 'VARCHAR(150) NULL AFTER physical_restrictions');
    await ensureColumnExists(conn, 'player_profiles', 'guardian_consent', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER guardian_name');
    await ensureColumnExists(conn, 'player_profiles', 'telemetry_consent', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER guardian_consent');

    // 3. Tabela de Auditoria e Logs Estruturados (RF23 + Observabilidade Seção 5)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(150) NULL,
        action VARCHAR(100) NOT NULL,
        severity ENUM('INFO', 'WARN', 'CRITICAL') NOT NULL DEFAULT 'INFO',
        entity_type VARCHAR(60) NULL,
        entity_id VARCHAR(100) NULL,
        correlation_id VARCHAR(100) NULL,
        ip_address VARCHAR(45) NULL,
        details TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await ensureColumnExists(conn, 'audit_logs', 'severity', "ENUM('INFO', 'WARN', 'CRITICAL') NOT NULL DEFAULT 'INFO' AFTER action");
    await ensureColumnExists(conn, 'audit_logs', 'entity_type', 'VARCHAR(60) NULL AFTER severity');
    await ensureColumnExists(conn, 'audit_logs', 'entity_id', 'VARCHAR(100) NULL AFTER entity_type');
    await ensureColumnExists(conn, 'audit_logs', 'correlation_id', 'VARCHAR(100) NULL AFTER entity_id');

    // 4. Tabela de Categorias de Treino e Marketplace (RF17, RF20)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(60) NOT NULL UNIQUE,
        code VARCHAR(40) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        target_audience VARCHAR(40) NOT NULL DEFAULT 'TODOS',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        display_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabela de Dispositivos IoT e Pareamento Autorizado (RF05, RF17, Cibersegurança IoT)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS iot_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        hardware_model VARCHAR(80) NOT NULL,
        firmware_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
        transport_type ENUM('USB_SERIAL', 'WIFI_WS', 'BLE', 'SIMULATOR') NOT NULL DEFAULT 'USB_SERIAL',
        auth_token_hash VARCHAR(255) NOT NULL,
        status ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE', 'FAULT') NOT NULL DEFAULT 'OFFLINE',
        piezo_thresholds_json LONGTEXT NOT NULL,
        sensor_health_json LONGTEXT NOT NULL,
        last_seen_at DATETIME NULL,
        paired_by_user_id INT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_device_paired_user FOREIGN KEY (paired_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Tabela de Treinos / Drills com Ciclo de Vida e Marketplace (RF14, RF16, RF18, RF20)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS drills (
        id VARCHAR(80) PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(40) NOT NULL,
        difficulty TINYINT NOT NULL DEFAULT 1,
        target_audience VARCHAR(40) NOT NULL DEFAULT 'TODOS',
        objective TEXT NULL,
        estimated_duration_sec INT NOT NULL DEFAULT 30,
        recommended_age_min INT NULL,
        recommended_age_max INT NULL,
        is_kids_adapted TINYINT(1) NOT NULL DEFAULT 0,
        current_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        status ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
        author_user_id INT NULL,
        author_name VARCHAR(150) NOT NULL,
        required_sensors_json LONGTEXT NOT NULL,
        steps_json LONGTEXT NOT NULL,
        scoring_rules_json LONGTEXT NULL,
        preparation_json LONGTEXT NULL,
        marketplace_json LONGTEXT NULL,
        published_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_drill_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Tabela de Histórico de Versões e Publicação de Treinos (RF16, RF18)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS drill_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drill_id VARCHAR(80) NOT NULL,
        version VARCHAR(32) NOT NULL,
        status ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL,
        changelog TEXT NOT NULL,
        compatible_machines_json LONGTEXT NOT NULL,
        compatible_hardware_json LONGTEXT NOT NULL,
        snapshot_json LONGTEXT NOT NULL,
        published_at DATETIME NULL,
        created_by_user_id INT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_drill_version (drill_id, version),
        CONSTRAINT fk_version_drill FOREIGN KEY (drill_id) REFERENCES drills(id) ON DELETE CASCADE,
        CONSTRAINT fk_version_author FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Tabela de Sessões de Treino com Chave de Idempotência (RF12, RF13, RF17, RF19, RF21)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        idempotency_key VARCHAR(120) NOT NULL UNIQUE,
        correlation_id VARCHAR(100) NULL,
        user_id INT NOT NULL,
        drill_id VARCHAR(80) NOT NULL,
        drill_version VARCHAR(32) NOT NULL,
        device_code VARCHAR(80) NULL,
        audience_mode ENUM('KIDS', 'ADULTO') NOT NULL DEFAULT 'ADULTO',
        status ENUM('COMPLETED', 'ABORTED', 'EMERGENCY_STOP', 'ERROR') NOT NULL DEFAULT 'COMPLETED',
        started_at DATETIME NOT NULL,
        ended_at DATETIME NOT NULL,
        duration_sec INT NOT NULL DEFAULT 0,
        score INT NOT NULL DEFAULT 0,
        max_streak INT NOT NULL DEFAULT 0,
        hits INT NOT NULL DEFAULT 0,
        misses INT NOT NULL DEFAULT 0,
        wrong_hits INT NOT NULL DEFAULT 0,
        accuracy_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
        avg_reaction_ms INT NOT NULL DEFAULT 0,
        consistency_ms INT NOT NULL DEFAULT 0,
        goals_met TINYINT(1) NOT NULL DEFAULT 0,
        stop_reason VARCHAR(255) NULL,
        metrics_json LONGTEXT NOT NULL,
        telemetry_included TINYINT(1) NOT NULL DEFAULT 0,
        mother_sync_status ENUM('SYNCED_MOCK', 'SYNCED_EXTERNAL', 'PENDING', 'FAILED') NOT NULL DEFAULT 'SYNCED_MOCK',
        mother_sync_id VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sessions_user_date (user_id, started_at),
        INDEX idx_sessions_drill (drill_id),
        CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Tabela de Eventos Brutos e Telemetria da Sessão (RF07, RF19 — sujeita a consentimento LGPD)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS session_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        event_index INT NOT NULL,
        event_type VARCHAR(40) NOT NULL,
        step_number INT NULL,
        target_id TINYINT NULL,
        expected_target_id TINYINT NULL,
        adc_value INT NULL,
        reaction_time_ms INT NULL,
        points_awarded INT NULL,
        occurred_at DATETIME(3) NOT NULL,
        device_timestamp_ms BIGINT NULL,
        metadata_json LONGTEXT NULL,
        INDEX idx_events_session (session_id, event_index),
        CONSTRAINT fk_events_session FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Tabela de Incidentes de Segurança Física e Parada de Emergência (RF22, RF23)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS safety_incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NULL,
        user_id INT NULL,
        user_name VARCHAR(150) NULL,
        device_code VARCHAR(80) NULL,
        incident_type ENUM('EMERGENCY_STOP', 'SENSOR_INCONSISTENT', 'COMMUNICATION_LOSS', 'AREA_UNSAFE', 'ACTUATOR_FAULT') NOT NULL,
        source VARCHAR(80) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        correlation_id VARCHAR(100) NULL,
        is_resolved TINYINT(1) NOT NULL DEFAULT 0,
        resolved_at DATETIME NULL,
        resolved_by_user_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_incident_session FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL,
        CONSTRAINT fk_incident_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Tabela de Parâmetros Gerais do Sistema (RF17)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(80) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        value_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') NOT NULL DEFAULT 'STRING',
        description VARCHAR(255) NOT NULL,
        updated_by_user_id INT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Tabela de Evidências de Integração com a Plataforma Mãe SmartTennis / Mock (RF18, RF19, Seção 9)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mother_platform_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receipt_id VARCHAR(100) NOT NULL UNIQUE,
        direction ENUM('OUTBOUND_SESSION', 'OUTBOUND_DRILL', 'INBOUND_CATALOG') NOT NULL,
        entity_id VARCHAR(120) NOT NULL,
        mode ENUM('mock', 'external') NOT NULL DEFAULT 'mock',
        status VARCHAR(40) NOT NULL,
        telemetry_forwarded TINYINT(1) NOT NULL DEFAULT 0,
        correlation_id VARCHAR(100) NULL,
        payload_summary_json LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // =========================================================================
    // SEEDS IDEMPOTENTES (Usuários, Categorias, Dispositivos IoT, Treinos, Sessões e Parâmetros)
    // =========================================================================

    // A. Seed de Usuários Padrão
    const [userRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const userCount = userRows[0]?.count || 0;

    if (userCount === 0) {
      console.log('Seeding initial users into smart_tennis_arena database...');

      const hashAdmin = await bcrypt.hash('admin123', 10);
      const hashTreinador = await bcrypt.hash('treinador123', 10);
      const hashJogador = await bcrypt.hash('jogador123', 10);
      const hashKids = await bcrypt.hash('kids123', 10);

      const [adminRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrador Arena', 'admin@smarttennis.com', hashAdmin, 'ADMIN']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals, telemetry_consent) VALUES (?, ?, ?, ?, ?)',
        [adminRes.insertId, 'AVANCADO', 'ADULTO', 'Administração global do ecossistema e treinos', 1]
      );

      const [treinadorRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Carlos Treinador', 'treinador@smarttennis.com', hashTreinador, 'TREINADOR']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals, telemetry_consent) VALUES (?, ?, ?, ?, ?)',
        [treinadorRes.insertId, 'AVANCADO', 'ADULTO', 'Criação e calibração de treinos gamificados', 1]
      );

      const [jogadorRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Lucas Praticante', 'jogador@smarttennis.com', hashJogador, 'JOGADOR']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals, preferences, telemetry_consent) VALUES (?, ?, ?, ?, ?, ?)',
        [
          jogadorRes.insertId,
          'INTERMEDIARIO',
          'ADULTO',
          'Melhorar precisão de forehand e tempo de reação',
          'Treinos de precisão e ritmo',
          1,
        ]
      );

      const [kidsRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Theo Kids', 'kids@smarttennis.com', hashKids, 'JOGADOR']
      );
      await conn.query(
        `INSERT INTO player_profiles (
          user_id, skill_level, age_group, training_goals, preferences, guardian_name, guardian_consent, telemetry_consent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kidsRes.insertId,
          'INICIANTE',
          'KIDS',
          'Diversão, aprender fundamentos do tênis com alvos coloridos',
          'Sons alegres e luzes dinâmicas',
          'Responsável Legal Demo',
          1,
          0,
        ]
      );

      await conn.query(
        'INSERT INTO audit_logs (action, severity, entity_type, details) VALUES (?, ?, ?, ?)',
        ['SYSTEM_INIT', 'INFO', 'DATABASE', 'Banco de dados inicializado com schema oficial, suporte LGPD e seeds padrão']
      );
    } else {
      await conn.query(
        `UPDATE player_profiles
         SET guardian_consent = 1,
             guardian_name = COALESCE(guardian_name, 'Responsável Legal Demo')
         WHERE age_group = 'KIDS' AND guardian_consent = 0`
      );
    }

    // B. Seed de Categorias (RF17, RF20)
    const [catRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM categories');
    if ((catRows[0]?.count || 0) === 0) {
      const initialCategories = [
        ['kids-ludico', 'KIDS_FUN', 'Kids & Iniciação Lúdica', 'Treinos com narrativa lúdica, alvos coloridos e ausência de penalidades para crianças.', 'KIDS', 1],
        ['reacao-competitiva', 'REACTION', 'Tempo de Reação & Reflexo', 'Estímulos visuais e sonoros de janela curta para ganho de velocidade neuromuscular.', 'AVANCADOS', 2],
        ['precisao-tecnica', 'PRECISION', 'Precisão Direcional & Tática', 'Controle de angulação, profundidade e alternância Forehand/Backhand.', 'INTERMEDIARIOS', 3],
        ['agilidade-quadra', 'AGILITY', 'Agilidade & Deslocamento', 'Cobertura de quadra em múltiplas direções e recuperação de centro.', 'TODOS', 4],
        ['resistencia-pro', 'ENDURANCE', 'Resistência & Alta Intensidade', 'Séries de cadência elevada sob fadiga inspiradas em circuitos profissionais.', 'AVANCADOS', 5],
      ];
      for (const c of initialCategories) {
        await conn.query(
          `INSERT INTO categories (slug, code, name, description, target_audience, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          c
        );
      }
    }

    // C. Seed de Dispositivos IoT Autorizados (RF05, RF17)
    const [devRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM iot_devices');
    if ((devRows[0]?.count || 0) === 0) {
      const tokenHash = await bcrypt.hash(config.iotDefaultPairingToken, 10);
      const defaultThresholds = JSON.stringify([250, 250, 250, 250, 250]);
      const healthySensors = JSON.stringify({
        piezo1: 'OK',
        piezo2: 'OK',
        piezo3: 'OK',
        piezo4: 'OK',
        piezo5: 'OK',
        leds: 'OK',
        buzzer: 'OK',
        estopButton: 'ARMED',
      });

      await conn.query(
        `INSERT INTO iot_devices (
          device_code, name, hardware_model, firmware_version, transport_type,
          auth_token_hash, status, piezo_thresholds_json, sensor_health_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'STA-UNO-R3-01',
          'Painel Oficial Quadra 01 (Arduino Uno R3)',
          'STA-UNO-R3',
          '1.0.0',
          'USB_SERIAL',
          tokenHash,
          'ONLINE',
          defaultThresholds,
          healthySensors,
        ]
      );

      await conn.query(
        `INSERT INTO iot_devices (
          device_code, name, hardware_model, firmware_version, transport_type,
          auth_token_hash, status, piezo_thresholds_json, sensor_health_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'STA-WIFI-BRIDGE-01',
          'Bridge Sem Fio Mobile Quadra 01 (Wi-Fi/WebSocket)',
          'ESP32-BRIDGE',
          '1.1.0',
          'WIFI_WS',
          tokenHash,
          'ONLINE',
          defaultThresholds,
          healthySensors,
        ]
      );

      await conn.query(
        `INSERT INTO iot_devices (
          device_code, name, hardware_model, firmware_version, transport_type,
          auth_token_hash, status, piezo_thresholds_json, sensor_health_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'STA-SIM-VIRTUAL-01',
          'Simulador Digital de Bancada + Spinshot Virtual',
          'MOCK-DRIVER',
          '1.1.0',
          'SIMULATOR',
          tokenHash,
          'ONLINE',
          defaultThresholds,
          healthySensors,
        ]
      );
    }

    // D. Seed de Treinos Publicados e Versões Iniciais (RF16, RF18, RF20)
    const [drillRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM drills');
    if ((drillRows[0]?.count || 0) === 0) {
      const [coachLookup] = await conn.query<mysql.RowDataPacket[]>(
        "SELECT id, name FROM users WHERE role IN ('TREINADOR', 'ADMIN') ORDER BY FIELD(role, 'TREINADOR', 'ADMIN') LIMIT 1"
      );
      const authorId = coachLookup[0]?.id ?? null;

      for (const d of DEFAULT_DRILLS) {
        const publishedAt = d.publishedAt ? new Date(d.publishedAt) : new Date();
        await conn.query(
          `INSERT INTO drills (
            id, title, description, category, difficulty, target_audience, objective,
            estimated_duration_sec, recommended_age_min, recommended_age_max, is_kids_adapted,
            current_version, status, author_user_id, author_name, required_sensors_json,
            steps_json, scoring_rules_json, preparation_json, marketplace_json, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id,
            d.title,
            d.description,
            d.category,
            d.difficulty,
            d.targetAudience || 'TODOS',
            d.objective || d.description,
            d.estimatedDurationSec || 30,
            d.recommendedAgeMin ?? null,
            d.recommendedAgeMax ?? null,
            d.isKidsAdapted ? 1 : 0,
            d.version,
            'PUBLISHED',
            authorId,
            d.authorName,
            JSON.stringify(d.requiredSensors || ['PIEZO_TARGETS', 'LED_RING', 'BUZZER', 'EMERGENCY_STOP']),
            JSON.stringify(d.steps),
            JSON.stringify(d.scoringRules || null),
            JSON.stringify(d.preparation || null),
            JSON.stringify(d.marketplace || null),
            publishedAt,
          ]
        );

        await conn.query(
          `INSERT INTO drill_versions (
            drill_id, version, status, changelog, compatible_machines_json,
            compatible_hardware_json, snapshot_json, published_at, created_by_user_id, created_by_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id,
            d.version,
            'PUBLISHED',
            'Versão oficial inicial homologada para o catálogo Smart Tennis Arena.',
            JSON.stringify(d.marketplace?.compatibleMachines || ['SPINSHOT_PLUS_2', 'STA_SIMULATOR_V1']),
            JSON.stringify(d.marketplace?.compatibleHardware || ['STA-UNO-R3', 'MOCK-DRIVER']),
            JSON.stringify(d),
            publishedAt,
            authorId,
            d.authorName,
          ]
        );
      }
    }

    // E. Seed de Parâmetros Gerais do Sistema (RF17)
    const [settingRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM system_settings');
    if ((settingRows[0]?.count || 0) === 0) {
      const defaultSettings: Array<[string, string, string, string]> = [
        ['max_ball_speed_kmh', '135', 'NUMBER', 'Velocidade máxima permitida na máquina lançadora Spinshot (km/h)'],
        ['kids_max_ball_speed_kmh', '65', 'NUMBER', 'Limite máximo de velocidade de bola em treinos adaptados ao Modo Kids (km/h)'],
        ['estop_latch_required', 'true', 'BOOLEAN', 'Exige reinício explícito do operador após acionamento de parada segura (!EMG)'],
        ['critical_latency_slo_ms', '50', 'NUMBER', 'Meta máxima de latência local para eventos críticos de impacto e !EMG (ms)'],
        ['telemetry_retention_days', '180', 'NUMBER', 'Prazo de retenção de telemetria bruta em conformidade com minimização LGPD (dias)'],
        ['mother_platform_mode', config.motherPlatform.mode, 'STRING', 'Modo de integração com a Plataforma Mãe SmartTennis (mock | external)'],
        ['marketplace_mvp_billing_enabled', 'false', 'BOOLEAN', 'Cobrança financeira desativada no MVP (apenas metadados comerciais RF20)'],
      ];

      for (const [k, v, t, desc] of defaultSettings) {
        await conn.query(
          `INSERT INTO system_settings (setting_key, setting_value, value_type, description)
           VALUES (?, ?, ?, ?)`,
          [k, v, t, desc]
        );
      }
    }

    // F. Seed de Sessões Históricas de Demonstração para Curva de Progressão (RF13)
    const [sessRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM training_sessions');
    if ((sessRows[0]?.count || 0) === 0) {
      const [playerLookup] = await conn.query<mysql.RowDataPacket[]>(
        "SELECT id FROM users WHERE email = 'jogador@smarttennis.com' LIMIT 1"
      );
      const playerId = playerLookup[0]?.id;
      if (playerId) {
        const now = Date.now();
        const demoSessions = [
          {
            key: 'seed-session-lucas-01',
            drillId: 'drill-interm-cross-precision',
            offsetHours: 72,
            durationSec: 34,
            score: 980,
            maxStreak: 3,
            hits: 5,
            misses: 2,
            wrongHits: 1,
            accuracyPct: 62.5,
            avgReactionMs: 1180,
            consistencyMs: 165,
            goalsMet: 0,
            hitsByTarget: { 1: 2, 2: 1, 3: 1, 4: 0, 5: 1 },
            reactionTimes: [1250, 1340, 1190, 960, 1160],
          },
          {
            key: 'seed-session-lucas-02',
            drillId: 'drill-interm-cross-precision',
            offsetHours: 48,
            durationSec: 32,
            score: 1210,
            maxStreak: 5,
            hits: 6,
            misses: 2,
            wrongHits: 0,
            accuracyPct: 75.0,
            avgReactionMs: 1020,
            consistencyMs: 120,
            goalsMet: 1,
            hitsByTarget: { 1: 2, 2: 2, 3: 1, 4: 0, 5: 1 },
            reactionTimes: [1120, 1080, 990, 880, 1030, 1020],
          },
          {
            key: 'seed-session-lucas-03',
            drillId: 'drill-pro-rapid-reflex',
            offsetHours: 24,
            durationSec: 35,
            score: 1540,
            maxStreak: 6,
            hits: 8,
            misses: 2,
            wrongHits: 0,
            accuracyPct: 80.0,
            avgReactionMs: 890,
            consistencyMs: 95,
            goalsMet: 1,
            hitsByTarget: { 1: 2, 2: 2, 3: 1, 4: 1, 5: 2 },
            reactionTimes: [980, 940, 890, 820, 860, 910, 850, 870],
          },
        ];

        for (const s of demoSessions) {
          const started = new Date(now - s.offsetHours * 3600 * 1000);
          const ended = new Date(started.getTime() + s.durationSec * 1000);
          const metricsPayload = {
            score: s.score,
            streak: s.maxStreak,
            maxStreak: s.maxStreak,
            hits: s.hits,
            misses: s.misses,
            wrongHits: s.wrongHits,
            reactionTimes: s.reactionTimes,
            averageReactionTimeMs: s.avgReactionMs,
            hitsByTarget: s.hitsByTarget,
          };
          const receiptId = `mp-seed-${s.key}`;

          await conn.query(
            `INSERT INTO training_sessions (
              idempotency_key, correlation_id, user_id, drill_id, drill_version, device_code,
              audience_mode, status, started_at, ended_at, duration_sec, score, max_streak,
              hits, misses, wrong_hits, accuracy_pct, avg_reaction_ms, consistency_ms,
              goals_met, metrics_json, telemetry_included, mother_sync_status, mother_sync_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.key,
              `corr-${s.key}`,
              playerId,
              s.drillId,
              '1.0.0',
              'STA-UNO-R3-01',
              'ADULTO',
              'COMPLETED',
              started,
              ended,
              s.durationSec,
              s.score,
              s.maxStreak,
              s.hits,
              s.misses,
              s.wrongHits,
              s.accuracyPct,
              s.avgReactionMs,
              s.consistencyMs,
              s.goalsMet,
              JSON.stringify(metricsPayload),
              1,
              'SYNCED_MOCK',
              receiptId,
            ]
          );

          await conn.query(
            `INSERT INTO mother_platform_sync_logs (
              receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              receiptId,
              'OUTBOUND_SESSION',
              s.key,
              'mock',
              'ACCEPTED',
              1,
              `corr-${s.key}`,
              JSON.stringify({ drillId: s.drillId, score: s.score, accuracyPct: s.accuracyPct }),
            ]
          );
        }
      }
    }
  } finally {
    conn.release();
  }
}

export interface AuditLogExtraOptions {
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  entityType?: string | null;
  entityId?: string | number | null;
  correlationId?: string | null;
}

// Helper para gravação de log de auditoria enriquecido (RF23 + Observabilidade)
export async function logAuditEvent(
  action: string,
  userId?: number | null,
  userName?: string | null,
  ipAddress?: string | null,
  details?: string | null,
  extra?: AuditLogExtraOptions
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        action, severity, entity_type, entity_id, correlation_id, user_id, user_name, ip_address, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        extra?.severity || 'INFO',
        extra?.entityType || null,
        extra?.entityId !== undefined && extra?.entityId !== null ? String(extra.entityId) : null,
        extra?.correlationId || null,
        userId || null,
        userName || null,
        ipAddress || null,
        details || null,
      ]
    );
  } catch (err) {
    console.error('Falha ao registrar log de auditoria:', err);
  }
}

// Execução direta via CLI (npm run db:init)
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ Banco de dados smart_tennis_arena inicializado e migrado com sucesso!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erro ao inicializar banco de dados:', err);
      process.exit(1);
    });
}

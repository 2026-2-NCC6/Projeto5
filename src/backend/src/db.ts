import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { DEFAULT_DRILLS } from '../../packages/shared/src/contracts/drills';

// Conexão inicial para garantir a existência do banco de dados
export async function ensureDatabaseExists(): Promise<void> {
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

// Criação e migração das tabelas
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

    // 2. Tabela de Perfil do Praticante (RF02 - Personalização, Faixa Etária, Nível, Metas)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        skill_level ENUM('INICIANTE', 'INTERMEDIARIO', 'AVANCADO') NOT NULL DEFAULT 'INICIANTE',
        age_group ENUM('KIDS', 'ADULTO') NOT NULL DEFAULT 'ADULTO',
        training_goals TEXT NULL,
        preferences TEXT NULL,
        physical_restrictions TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tabela de Auditoria e Logs (RF23)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(150) NULL,
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NULL,
        details TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tabela de Catálogo, Versionamento e Marketplace de Treinos (RF03, RF04, RF14, RF15, RF16, RF18, RF20)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS drills (
        id VARCHAR(80) PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(40) NOT NULL DEFAULT 'PRECISION',
        difficulty TINYINT NOT NULL DEFAULT 3,
        recommended_age_min INT NULL,
        recommended_age_max INT NULL,
        is_kids_adapted TINYINT(1) NOT NULL DEFAULT 0,
        version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        status ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
        author_id INT NULL,
        author_name VARCHAR(150) NOT NULL,
        steps_json LONGTEXT NOT NULL,
        preparation_json LONGTEXT NULL,
        marketplace_json LONGTEXT NULL,
        changelog_json LONGTEXT NULL,
        published_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_drills_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabela de Sessões de Treino, Resultados e Telemetria (RF12, RF13, RF19, RF21)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_uuid VARCHAR(64) NOT NULL UNIQUE,
        user_id INT NULL,
        athlete_name VARCHAR(150) NOT NULL,
        drill_id VARCHAR(80) NOT NULL,
        drill_title VARCHAR(180) NOT NULL,
        drill_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
        is_kids_mode TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('COMPLETED', 'ABORTED', 'EMERGENCY_STOP') NOT NULL DEFAULT 'COMPLETED',
        score INT NOT NULL DEFAULT 0,
        max_streak INT NOT NULL DEFAULT 0,
        hits INT NOT NULL DEFAULT 0,
        misses INT NOT NULL DEFAULT 0,
        wrong_hits INT NOT NULL DEFAULT 0,
        accuracy_pct INT NOT NULL DEFAULT 0,
        average_reaction_time_ms INT NOT NULL DEFAULT 0,
        duration_sec INT NOT NULL DEFAULT 0,
        hardware_mode VARCHAR(32) NOT NULL DEFAULT 'MOCK',
        zone_analytics_json LONGTEXT NOT NULL,
        events_telemetry_json LONGTEXT NULL,
        telemetry_authorized TINYINT(1) NOT NULL DEFAULT 1,
        synced_from_offline TINYINT(1) NOT NULL DEFAULT 0,
        started_at DATETIME NOT NULL,
        completed_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Seed de Usuários Padrão para Testes e Demonstração
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const userCount = rows[0]?.count || 0;

    if (userCount === 0) {
      console.log('Seeding initial users into smart_tennis_arena database...');

      const hashAdmin = await bcrypt.hash('admin123', 10);
      const hashTreinador = await bcrypt.hash('treinador123', 10);
      const hashJogador = await bcrypt.hash('jogador123', 10);
      const hashKids = await bcrypt.hash('kids123', 10);

      // Inserir Admin
      const [adminRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrador Arena', 'admin@smarttennis.com', hashAdmin, 'ADMIN']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals) VALUES (?, ?, ?, ?)',
        [adminRes.insertId, 'AVANCADO', 'ADULTO', 'Administração global do ecossistema e treinos']
      );

      // Inserir Treinador
      const [treinadorRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Carlos Treinador', 'treinador@smarttennis.com', hashTreinador, 'TREINADOR']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals) VALUES (?, ?, ?, ?)',
        [treinadorRes.insertId, 'AVANCADO', 'ADULTO', 'Criação e calibração de treinos gamificados']
      );

      // Inserir Jogador Adulto (Modo Pro)
      const [jogadorRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Lucas Praticante', 'jogador@smarttennis.com', hashJogador, 'JOGADOR']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals, preferences) VALUES (?, ?, ?, ?, ?)',
        [jogadorRes.insertId, 'INTERMEDIARIO', 'ADULTO', 'Melhorar precisão de forehand e tempo de reação', 'Treinos de precisão e ritmo']
      );

      // Inserir Jogador Kids (Modo Lúdico)
      const [kidsRes] = await conn.query<mysql.ResultSetHeader>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Theo Kids', 'kids@smarttennis.com', hashKids, 'JOGADOR']
      );
      await conn.query(
        'INSERT INTO player_profiles (user_id, skill_level, age_group, training_goals, preferences) VALUES (?, ?, ?, ?, ?)',
        [kidsRes.insertId, 'INICIANTE', 'KIDS', 'Diversão, aprender fundamentos do tênis com alvos coloridos', 'Sons alegres e luzes dinâmicas']
      );

      // Log inicial de auditoria
      await conn.query(
        'INSERT INTO audit_logs (action, details) VALUES (?, ?)',
        ['SYSTEM_INIT', 'Banco de dados inicializado com schema oficial e seeds padrão']
      );

      console.log('Seed completed successfully!');
    }

    // 7. Seed do Catálogo Oficial de Treinos (RF03, RF14, RF16, RF18, RF20)
    const [drillRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM drills');
    const drillCount = drillRows[0]?.count || 0;

    if (drillCount === 0) {
      console.log('Seeding official drills into smart_tennis_arena database...');
      for (const d of DEFAULT_DRILLS) {
        await conn.query(
          `INSERT INTO drills (
            id, title, description, category, difficulty,
            recommended_age_min, recommended_age_max, is_kids_adapted,
            version, status, author_name, steps_json,
            preparation_json, marketplace_json, changelog_json, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            d.id,
            d.title,
            d.description,
            d.category,
            d.difficulty,
            d.recommendedAgeMin ?? null,
            d.recommendedAgeMax ?? null,
            d.isKidsAdapted ? 1 : 0,
            d.version,
            d.status || 'PUBLISHED',
            d.authorName,
            JSON.stringify(d.steps),
            d.preparation ? JSON.stringify(d.preparation) : null,
            d.marketplace ? JSON.stringify(d.marketplace) : null,
            d.changelog ? JSON.stringify(d.changelog) : null,
          ]
        );
      }
    }

    // 8. Seed de Histórico de Sessões para Indicadores e Evolução (RF13)
    const [sessionRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM training_sessions');
    const sessionCount = sessionRows[0]?.count || 0;

    if (sessionCount === 0) {
      console.log('Seeding initial training sessions for RF13 analytics...');
      const sampleZonePro = JSON.stringify({
        attempts: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 },
        hits: { 1: 3, 2: 2, 3: 1, 4: 2, 5: 1 },
        avgReactionMs: { 1: 680, 2: 720, 3: 890, 4: 740, 5: 650 },
      });
      const sampleZoneKids = JSON.stringify({
        attempts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 },
        hits: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 },
        avgReactionMs: { 1: 1250, 2: 1320, 3: 1410, 4: 1180, 5: 1100 },
      });

      await conn.query(
        `INSERT INTO training_sessions (
          session_uuid, user_id, athlete_name, drill_id, drill_title, drill_version,
          is_kids_mode, status, score, max_streak, hits, misses, wrong_hits,
          accuracy_pct, average_reaction_time_ms, duration_sec, hardware_mode,
          zone_analytics_json, telemetry_authorized, synced_from_offline,
          started_at, completed_at
        ) VALUES
        ('seed-session-001', 3, 'Lucas Praticante', 'drill-interm-cross-precision', 'Precisão Cruzada (Forehand & Backhand)', '1.0.0', 0, 'COMPLETED', 1240, 5, 7, 1, 0, 88, 790, 25, 'MOCK', ?, 1, 0, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
        ('seed-session-002', 3, 'Lucas Praticante', 'drill-pro-rapid-reflex', 'Reflexo Rápido (Fundo de Quadra)', '1.0.0', 0, 'COMPLETED', 1680, 7, 9, 1, 0, 90, 710, 26, 'WEB_SERIAL', ?, 1, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
        ('seed-session-003', 4, 'Theo Kids', 'drill-kids-magic-targets', 'Alvos Mágicos do Tênis', '1.0.0', 1, 'COMPLETED', 1120, 6, 6, 0, 0, 100, 1240, 24, 'MOCK', ?, 0, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR))`,
        [sampleZonePro, sampleZonePro, sampleZoneKids]
      );
    }
  } finally {
    conn.release();
  }
}

// Helper para gravação de log de auditoria (RF23)
export async function logAuditEvent(
  action: string,
  userId?: number | null,
  userName?: string | null,
  ipAddress?: string | null,
  details?: string | null
): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, user_id, user_name, ip_address, details) VALUES (?, ?, ?, ?, ?)',
      [action, userId || null, userName || null, ipAddress || null, details || null]
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

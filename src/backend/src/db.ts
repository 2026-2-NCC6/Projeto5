import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config';

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

    // 4. Seed de Usuários Padrão para Testes e Demonstração
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


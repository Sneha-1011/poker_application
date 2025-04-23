import mysql from "mysql2/promise"

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "Sneha@.03",
  database: process.env.MYSQL_DATABASE || "pokergamedb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    const [rows] = await pool.execute(query, params)
    return rows as T
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Create players table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        chips INT DEFAULT 1000,
        games_played INT DEFAULT 0,
        games_won INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create games table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        winner_id INT,
        pot_size INT,
        player_count INT,
        FOREIGN KEY (winner_id) REFERENCES players(id)
      )
    `)

    // Create game_rounds table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        round_type ENUM('PRE_FLOP', 'FLOP', 'TURN', 'RIVER') NOT NULL,
        pot_size INT,
        community_cards JSON,
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `)

    // Create player_actions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS player_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        round_id INT,
        player_id INT,
        action_type ENUM('CHECK', 'BET', 'CALL', 'RAISE', 'FOLD') NOT NULL,
        amount INT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (round_id) REFERENCES game_rounds(id),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )
    `)

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Failed to initialize database:", error)
    throw error
  }
}

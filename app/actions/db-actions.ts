"use server"

import mysql from "mysql2/promise"

const rootPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "Sneha@.03",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Create a connection pool with the database
let pool: mysql.Pool | null = null

// Initialize the database and create a connection pool
async function initializePool() {
  const dbName = "pokergamedb"

  try {
    await rootPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`)

    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "Sneha@.03",
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })

    return pool
  } catch (error) {
    console.error("Failed to initialize database pool:", error)
    throw error
  }
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    // Initialize pool if it doesn't exist
    if (!pool) {
      await initializePool()
    }

    const [rows] = await pool!.execute(query, params)
    return rows as T
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Make sure pool is initialized
    if (!pool) {
      await initializePool()
    }

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
        FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL
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
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `)

    // Create player_actions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS player_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        player_id INT,
        round_id INT,
        action_type ENUM('CHECK', 'BET', 'CALL', 'RAISE', 'FOLD') NOT NULL,
        amount INT DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (round_id) REFERENCES game_rounds(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `)

    return { success: true, message: "Database initialized successfully" }
  } catch (error) {
    console.error("Failed to initialize database:", error)
    return { success: false, message: "Failed to initialize database: " + (error as Error).message }
  }
}

// Save game results to database
export async function saveGameResults(gameData: any): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Saving game data:", JSON.stringify(gameData, null, 2))

    for (const player of gameData.players) {
      // Check if player exists
      const existingPlayers = await executeQuery<any[]>(`SELECT id FROM players WHERE id = ?`, [player.id])
    
      if (existingPlayers.length === 0) {
        // Player doesn't exist, insert them
        await executeQuery(
          `
          INSERT INTO players (name, chips, games_played, games_won)
          VALUES (?, ?, 1, ?)
          `,
          [player.name, player.chips, gameData.winners.includes(player.id) ? 1 : 0],
        )
      } else {
        // Player exists, update them
        await executeQuery(
          `
          UPDATE players
          SET 
            chips = ?,
            games_played = games_played + 1,
            games_won = games_won + ?
          WHERE id = ?
          `,
          [player.chips, gameData.winners.includes(player.id) ? 1 : 0, player.id],
        )
      }
    }
    

    // Now insert the game record
    const gameResult = await executeQuery<any>(
      `
      INSERT INTO games (player_count, pot_size, winner_id)
      VALUES (?, ?, ?)
    `,
      [gameData.playerCount, gameData.pot, gameData.winnerId],
    )

    const gameId = gameResult.insertId
    console.log("Game inserted with ID:", gameId)

    // Insert actions
    for (const action of gameData.actions) {
      await executeQuery(
        `
        INSERT INTO player_actions (game_id, player_id, action_type, amount)
        VALUES (?, ?, ?, ?)
      `,
        [gameId, action.playerId, action.type.toUpperCase(), action.amount || 0],
      )
    }

    console.log("Game results saved successfully")
    return { success: true, message: "Game results saved successfully" }
  } catch (error) {
    console.error("Failed to save game results:", error)
    return { success: false, message: "Failed to save game results: " + (error as Error).message }
  }
}

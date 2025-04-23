import { executeQuery } from "./db-actions"

async function init() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        chips INT DEFAULT 1000,
        games_played INT DEFAULT 0,
        games_won INT DEFAULT 0
      )
    `)

    console.log("✅ Database initialized.")
  } catch (error) {
    console.error("❌ Failed to initialize database:", error)
  }
}

init()

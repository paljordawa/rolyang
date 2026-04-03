import { createClient } from "@libsql/client/node";

const client = createClient({
  url: "file:local.db",
});

async function migrate() {
  try {
    console.log("Starting migration...");

    // 1. Add added_at to tracks if it doesn't exist
    // Note: SQLite doesn't directly support checking if a column exists easily in one command 
    // unless using try-catch or PRAGMA.
    try {
      await client.execute(`ALTER TABLE tracks ADD COLUMN added_at DATETIME`);
      console.log("Added 'added_at' column to 'tracks'.");
    } catch (e) {
      if (e.message.includes("duplicate column name")) {
        console.log("'added_at' already exists on 'tracks'.");
      } else {
        throw e;
      }
    }

    // 2. Create follows table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS follows (
        artist_name TEXT PRIMARY KEY,
        followed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created/Verified 'follows' table.");

    // 4. Create playlists tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        cover TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created/Verified 'playlists' table.");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);
    console.log("Created/Verified 'playlist_tracks' table.");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();

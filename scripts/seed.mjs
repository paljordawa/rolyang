import { createClient } from "@libsql/client/node";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function seed() {
  try {
    const dataPath = path.join(process.cwd(), 'src/data/data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log("Recreating tables...");
    await client.execute(`DROP TABLE IF EXISTS tracks`);
    await client.execute(`DROP TABLE IF EXISTS albums`);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        cover TEXT,
        description TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        album_id TEXT NOT NULL,
        title TEXT NOT NULL,
        audio TEXT NOT NULL,
        duration TEXT,
        liked INTEGER DEFAULT 0,
        play_count INTEGER DEFAULT 0,
        FOREIGN KEY (album_id) REFERENCES albums(id)
      )
    `);

    console.log("Seeding data...");
    for (const album of data) {
      await client.execute({
        sql: "INSERT INTO albums (id, title, artist, cover, description) VALUES (?, ?, ?, ?, ?)",
        args: [album.id, album.title, album.artist, album.cover, album.description || ""]
      });

      for (const track of (album.chapters || [])) {
        await client.execute({
          sql: "INSERT INTO tracks (id, album_id, title, audio, duration, liked, play_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [track.id, album.id, track.title, track.audio, track.duration || "", track.liked ? 1 : 0, 0]
        });
      }
    }

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();

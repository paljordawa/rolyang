import { createClient } from "@libsql/client";

const client = createClient({
  url: "file:local.db",
});

async function main() {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables:", JSON.stringify(tables.rows.map(r => r.name), null, 2));

  for (const table of tables.rows) {
     if (table.name.startsWith('_')) continue;
     const info = await client.execute(`PRAGMA table_info(${table.name})`);
     console.log(`Schema for ${table.name}:`, JSON.stringify(info.rows, null, 2));
  }
}

main().catch(console.error);

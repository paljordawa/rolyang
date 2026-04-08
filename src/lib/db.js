import { createClient } from "@libsql/client";

// Support both Astro's import.meta.env and Node's process.env
const syncUrl = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.TURSO_DATABASE_URL : undefined) 
  || (typeof process !== 'undefined' ? process.env.TURSO_DATABASE_URL : undefined);
  
const authToken = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.TURSO_AUTH_TOKEN : undefined) 
  || (typeof process !== 'undefined' ? process.env.TURSO_AUTH_TOKEN : undefined);

const config = {
  url: "file:local.db"
};

// If a Turso URL is provided, configure the database as an embedded replica
if (syncUrl) {
  config.syncUrl = syncUrl;
  config.authToken = authToken;
  config.syncInterval = 60; // Auto-syncs with Turso every 60 seconds
}

export const client = createClient(config);

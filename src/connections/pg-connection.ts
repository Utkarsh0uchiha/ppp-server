import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT;

if (!DB_USER) throw new Error("DB_USER is not defined");
if (!DB_PASSWORD) throw new Error("DB_PASSWORD is not defined");
if (!DB_HOST) throw new Error("DB_HOST is not defined");
if (!DB_NAME) throw new Error("DB_NAME is not defined");
if (!DB_PORT) throw new Error("DB_PORT is not defined");

console.log("PostgreSQL configuration:");
console.log("DB_USER:", DB_USER);
console.log("DB_HOST:", DB_HOST);
console.log("DB_NAME:", DB_NAME);
console.log("DB_PORT:", DB_PORT);

// PostgreSQL connection pool
const dbPool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASSWORD,
  port: Number(DB_PORT),

  // Aiven PostgreSQL requires SSL
  ssl: {
    rejectUnauthorized: false,
  },

  statement_timeout: 10000,
  maxLifetimeSeconds: 30,
  idleTimeoutMillis: 30000,
});

// Test PostgreSQL connection
const testConnection = async (): Promise<void> => {
  try {
    const client = await dbPool.connect();

    console.log("Connected to the PostgreSQL database!");

    client.release();
  } catch (error) {
    console.error(
      "Failed to connect to the PostgreSQL database:",
      error
    );
  }
};

export { dbPool, testConnection };
require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(label, operation) {
  const attempts = 30;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      const seconds = Math.min(3 + attempt, 10);
      console.log(`${label}: MySQL no esta listo (${error.code || error.message}). Reintento ${attempt}/${attempts} en ${seconds}s.`);
      await wait(seconds * 1000);
    }
  }
}

async function migrate() {
  const possibleDatabaseUrls = [process.env.DATABASE_URL, process.env.MYSQL_URL].filter(Boolean);
  const configuredDatabaseUrl = possibleDatabaseUrls.find((value) => (
    value.startsWith("mysql://") || value.startsWith("mysql2://")
  ));

  if (!configuredDatabaseUrl) {
    throw new Error("DATABASE_URL o MYSQL_URL debe ser una URL completa de MySQL, por ejemplo ${{ MySQL.MYSQL_URL }} en Railway.");
  }

  const databaseUrl = new URL(configuredDatabaseUrl);
  const databaseName = databaseUrl.pathname.replace(/^\//, "");

  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error("El nombre de la base de datos solo puede usar letras, numeros y guion bajo.");
  }

  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  const setupConnection = await withRetries("Conexion inicial", () => (
    mysql.createConnection({
      host: databaseUrl.hostname,
      port: Number.parseInt(databaseUrl.port || "3306", 10),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      connectTimeout: 10000
    })
  ));

  try {
    await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  } finally {
    await setupConnection.end();
  }

  const connection = await withRetries("Conexion a base", () => (
    mysql.createConnection({
      uri: configuredDatabaseUrl,
      multipleStatements: true,
      connectTimeout: 10000
    })
  ));

  try {
    await connection.query(sql);
    console.log("Migracion completada.");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});

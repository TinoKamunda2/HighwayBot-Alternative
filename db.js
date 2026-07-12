import mysql from "mysql2/promise";

const retryInterval = 5000; // 5 seconds
const maxRetries = 10; // keep this low to fail fast
let retryCount = 0;

// ✅ Create connection pool with SSL (REQUIRED for Clever Cloud)
const pool = mysql.createPool({
  host: "bazkxcmg8fjke8dvvegr-mysql.services.clever-cloud.com",
  port: 21402,
  user: "ula04sb2vdmtsdkm",
  password: "QPedfUwaDZD9bMp3hOO",
  database: "bazkxcmg8fjke8dvvegr",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  connectTimeout: 10000, // 10s timeout

  ssl: {
    rejectUnauthorized: false, // ⚠️ required for Clever Cloud
  },
});

// ✅ Retry connection test
async function connectWithRetry() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database connected. Thread ID:", conn.threadId);

    conn.release();
    retryCount = 0;
  } catch (err) {
    console.error("❌ DB connection error:", err.message);

    retryCount++;

    if (retryCount < maxRetries) {
      console.log(
        `🔁 Retrying in ${retryInterval / 1000}s... (${retryCount}/${maxRetries})`
      );
      setTimeout(connectWithRetry, retryInterval);
    } else {
      console.error("💥 Max retries reached. Exiting...");
      process.exit(1);
    }
  }
}

// Start connection check
connectWithRetry();

export default pool;

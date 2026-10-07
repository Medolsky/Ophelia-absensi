require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const API_SECRET =
  process.env.API_SECRET ||
  "oph_live_b4958b8b1f1eb1c1e7ca47dd8500fe4c8dcbe638ea45740e";

// Create MySQL connection pool (Read-Only queries recommended)
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "opheliav2",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(express.json());

// Authentication Middleware
function authMiddleware(req, res, next) {
  const secretHeader = req.headers["x-api-secret"] || req.query.secret;
  if (!secretHeader || secretHeader !== API_SECRET) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized: Invalid or missing X-API-Secret header",
    });
  }
  next();
}

// Allowed / tracked jobs mapping
const TRACKED_JOBS = ["police", "ambulance", "mechanic", "pedagang", "resto"];
const JOB_SLUG_MAP = {
  police: "police",
  ambulance: "medical",
  mechanic: "mechanic",
  pedagang: "restaurant",
  resto: "restaurant",
};

// Safe JSON parser helper
function safeJsonParse(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// Health check endpoint (public)
app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 as alive");
    res.json({
      ok: true,
      status: "healthy",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: "unhealthy",
      database: "error",
      message: err.message,
    });
  }
});

// Protect all /api routes
app.use("/api", authMiddleware);

/**
 * GET /api/players
 * List players with optional filters: ?job=police &onduty=1
 */
app.get("/api/players", async (req, res) => {
  try {
    const { job, onduty, limit = 200 } = req.query;

    let query = `
      SELECT 
        citizenid, cid, license, name, money, charinfo, job, metadata, last_updated,
        lbtablet_job_name, lbtablet_job_grade_name, lbtablet_job_grade_level
      FROM players
    `;
    const params = [];
    const conditions = [];

    if (job) {
      conditions.push("(lbtablet_job_name = ? OR JSON_EXTRACT(job, '$.name') = ?)");
      params.push(job, job);
    } else {
      // By default, filter to tracked jobs if not requesting all
      conditions.push(
        "(lbtablet_job_name IN (?, ?, ?, ?, ?) OR JSON_EXTRACT(job, '$.name') IN (?, ?, ?, ?, ?))"
      );
      params.push(...TRACKED_JOBS, ...TRACKED_JOBS);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY last_updated DESC LIMIT ?";
    params.push(Number(limit) || 200);

    const [rows] = await pool.query(query, params);

    const formatted = rows
      .map((row) => {
        const charinfo = safeJsonParse(row.charinfo, {});
        const jobData = safeJsonParse(row.job, {});
        const money = safeJsonParse(row.money, {});
        const metadata = safeJsonParse(row.metadata, {});

        const jobName = jobData.name || row.lbtablet_job_name || "unemployed";
        const mappedSlug = JOB_SLUG_MAP[jobName] || null;

        return {
          citizenid: row.citizenid,
          name: row.name,
          fullname: `${charinfo.firstname || ""} ${charinfo.lastname || ""}`.trim() || row.name,
          phone: charinfo.phone || null,
          gender: charinfo.gender === 0 ? "male" : "female",
          job: {
            name: jobName,
            label: jobData.label || row.lbtablet_job_name || "Civilian",
            onduty: Boolean(jobData.onduty),
            payment: jobData.payment || 0,
            grade: {
              name: jobData.grade?.name || row.lbtablet_job_grade_name || "Staff",
              level: Number(jobData.grade?.level ?? row.lbtablet_job_grade_level ?? 0),
            },
            institutionSlug: mappedSlug,
          },
          money: {
            cash: Number(money.cash || 0),
            bank: Number(money.bank || 0),
          },
          callsign: metadata.callsign || null,
          bloodtype: metadata.bloodtype || null,
          lastUpdated: row.last_updated,
        };
      })
      .filter((p) => (onduty !== undefined ? String(p.job.onduty) === String(onduty === "1" || onduty === "true") : true));

    res.json({
      ok: true,
      count: formatted.length,
      players: formatted,
    });
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/players/by-job/:jobName
 */
app.get("/api/players/by-job/:jobName", async (req, res) => {
  const { jobName } = req.params;
  const targetJob = jobName.toLowerCase();

  try {
    const query = `
      SELECT 
        citizenid, cid, license, name, money, charinfo, job, metadata, last_updated,
        lbtablet_job_name, lbtablet_job_grade_name, lbtablet_job_grade_level
      FROM players
      WHERE lbtablet_job_name = ? OR JSON_EXTRACT(job, '$.name') = ?
      ORDER BY last_updated DESC
    `;
    const [rows] = await pool.query(query, [targetJob, targetJob]);

    const formatted = rows.map((row) => {
      const charinfo = safeJsonParse(row.charinfo, {});
      const jobData = safeJsonParse(row.job, {});
      const money = safeJsonParse(row.money, {});
      const metadata = safeJsonParse(row.metadata, {});

      return {
        citizenid: row.citizenid,
        name: row.name,
        fullname: `${charinfo.firstname || ""} ${charinfo.lastname || ""}`.trim() || row.name,
        phone: charinfo.phone || null,
        job: {
          name: jobData.name || row.lbtablet_job_name,
          label: jobData.label || "Member",
          onduty: Boolean(jobData.onduty),
          grade: {
            name: jobData.grade?.name || row.lbtablet_job_grade_name || "Staff",
            level: Number(jobData.grade?.level ?? row.lbtablet_job_grade_level ?? 0),
          },
          institutionSlug: JOB_SLUG_MAP[targetJob] || null,
        },
        money: {
          bank: Number(money.bank || 0),
          cash: Number(money.cash || 0),
        },
        callsign: metadata.callsign || null,
        lastUpdated: row.last_updated,
      };
    });

    res.json({
      ok: true,
      job: targetJob,
      count: formatted.length,
      players: formatted,
    });
  } catch (err) {
    console.error("Error fetching players by job:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/player/:citizenid
 * Detailed profile for a single player
 */
app.get("/api/player/:citizenid", async (req, res) => {
  const { citizenid } = req.params;

  try {
    const query = `
      SELECT citizenid, cid, license, name, money, charinfo, job, gang, metadata, last_updated
      FROM players
      WHERE citizenid = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [citizenid]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Player not found" });
    }

    const row = rows[0];
    const charinfo = safeJsonParse(row.charinfo, {});
    const jobData = safeJsonParse(row.job, {});
    const money = safeJsonParse(row.money, {});
    const metadata = safeJsonParse(row.metadata, {});

    const jobName = jobData.name || "unemployed";

    res.json({
      ok: true,
      player: {
        citizenid: row.citizenid,
        license: row.license,
        accountName: row.name,
        charinfo: {
          firstname: charinfo.firstname,
          lastname: charinfo.lastname,
          fullname: `${charinfo.firstname || ""} ${charinfo.lastname || ""}`.trim(),
          birthdate: charinfo.birthdate,
          gender: charinfo.gender === 0 ? "male" : "female",
          nationality: charinfo.nationality,
          phone: charinfo.phone,
          accountNumber: charinfo.account,
        },
        job: {
          ...jobData,
          institutionSlug: JOB_SLUG_MAP[jobName] || null,
        },
        money,
        metadata: {
          callsign: metadata.callsign,
          bloodtype: metadata.bloodtype,
          fingerprint: metadata.fingerprint,
          licences: metadata.licences,
        },
        lastUpdated: row.last_updated,
      },
    });
  } catch (err) {
    console.error("Error fetching player detail:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/bank-accounts/society
 * Fetch society/management accounts from bablo_bank_accounts
 */
app.get("/api/bank-accounts/society", async (req, res) => {
  try {
    const query = `
      SELECT account_number, name, balance, type, created_at, updated_at
      FROM bablo_bank_accounts
      WHERE account_number IN ('society_police', 'society_ambulance', 'society_mechanic', 'society_pedagang')
         OR account_number LIKE 'society_%'
      ORDER BY name ASC
    `;
    const [rows] = await pool.query(query);

    // Map each society account to web app institution
    const mapped = rows.map((acc) => {
      let institutionSlug = null;
      let institutionName = acc.name;

      if (acc.account_number === "society_police") {
        institutionSlug = "police";
        institutionName = "Ophelia Police Department";
      } else if (acc.account_number === "society_ambulance") {
        institutionSlug = "medical";
        institutionName = "Ophelia Medical Center";
      } else if (acc.account_number === "society_mechanic") {
        institutionSlug = "mechanic";
        institutionName = "Ophelia Custom Garage";
      } else if (acc.account_number === "society_pedagang") {
        institutionSlug = "restaurant";
        institutionName = "Ophelia Restaurant & Lounge";
      }

      return {
        accountNumber: acc.account_number,
        accountName: acc.name,
        institutionName,
        institutionSlug,
        balance: Number(acc.balance || 0),
        currency: "Rp",
        type: acc.type,
        updatedAt: acc.updated_at,
      };
    });

    res.json({
      ok: true,
      count: mapped.length,
      accounts: mapped,
    });
  } catch (err) {
    console.error("Error fetching society accounts:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/stats/overview
 * Quick summary stats of tracked institutions
 */
app.get("/api/stats/overview", async (req, res) => {
  try {
    // 1. Count members per job
    const [jobCounts] = await pool.query(`
      SELECT 
        lbtablet_job_name as jobName, 
        COUNT(*) as totalMembers,
        SUM(CASE WHEN JSON_EXTRACT(job, '$.onduty') = true THEN 1 ELSE 0 END) as onDutyCount
      FROM players
      WHERE lbtablet_job_name IN ('police', 'ambulance', 'mechanic', 'pedagang', 'resto')
      GROUP BY lbtablet_job_name
    `);

    // 2. Society bank balances
    const [bankBalances] = await pool.query(`
      SELECT account_number, balance 
      FROM bablo_bank_accounts
      WHERE account_number IN ('society_police', 'society_ambulance', 'society_mechanic', 'society_pedagang')
    `);

    res.json({
      ok: true,
      jobs: jobCounts.map((j) => ({
        jobName: j.jobName,
        institutionSlug: JOB_SLUG_MAP[j.jobName] || j.jobName,
        totalMembers: Number(j.totalMembers || 0),
        onDutyCount: Number(j.onDutyCount || 0),
      })),
      finances: bankBalances.map((b) => ({
        accountNumber: b.account_number,
        balance: Number(b.balance || 0),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching overview stats:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Gang slug mapping for Badside
const GANG_SLUG_MAP = {
  hightable: "high-table",
  whitetiger: "white-tiger",
  vanity: "vanity",
  xyk: "xyk",
  csr: "csr",
  sog: "sog",
  olivercasper: "oliver-casper",
  ghostfams: "ghost-fams",
};

/**
 * GET /api/badside/players
 * Fetch all syndicate and gang members from MySQL database
 */
app.get("/api/badside/players", async (req, res) => {
  try {
    const { gang, limit = 200 } = req.query;
    let query = `
      SELECT citizenid, cid, license, name, money, charinfo, gang, position, last_updated
      FROM players
      WHERE gang IS NOT NULL AND gang != '' AND gang != 'null'
    `;
    const params = [];
    if (gang) {
      query += ` AND JSON_EXTRACT(gang, '$.name') = ?`;
      params.push(gang);
    } else {
      query += ` AND JSON_EXTRACT(gang, '$.name') != 'none'`;
    }
    query += ` ORDER BY last_updated DESC LIMIT ?`;
    params.push(Number(limit) || 200);

    const [rows] = await pool.query(query, params);
    const formatted = rows.map((row) => {
      const charinfo = safeJsonParse(row.charinfo, {});
      const gangData = safeJsonParse(row.gang, {});
      const money = safeJsonParse(row.money, {});
      const position = safeJsonParse(row.position, {});
      const gangName = gangData.name || "none";

      return {
        citizenid: row.citizenid,
        name: row.name,
        fullname: `${charinfo.firstname || ""} ${charinfo.lastname || ""}`.trim() || row.name,
        license: row.license,
        phone: charinfo.phone || null,
        gang: {
          name: gangName,
          label: gangData.label || gangName,
          isboss: Boolean(gangData.isboss),
          grade: {
            name: gangData.grade?.name || "Member",
            level: Number(gangData.grade?.level || 0),
          },
          slug: GANG_SLUG_MAP[gangName] || gangName,
        },
        money: {
          cash: Number(money.cash || 0),
          bank: Number(money.bank || 0),
        },
        position: position.x ? { x: position.x, y: position.y, z: position.z } : null,
        lastUpdated: row.last_updated,
      };
    });

    res.json({
      ok: true,
      count: formatted.length,
      players: formatted,
    });
  } catch (err) {
    console.error("Error fetching badside players:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/billing
 * List fines, invoices and citations from rey_billing
 */
app.get("/api/billing", async (req, res) => {
  try {
    const { job, status, limit = 100 } = req.query;
    let query = `
      SELECT id, citizenid, target_name, sender_citizenid, sender_name, job, society, amount, reason, status, paid_method, created_at, paid_at
      FROM rey_billing
    `;
    const params = [];
    const conditions = [];
    if (job) {
      conditions.push("job = ?");
      params.push(job);
    }
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(Number(limit) || 100);

    const [rows] = await pool.query(query, params);
    res.json({ ok: true, count: rows.length, bills: rows });
  } catch (err) {
    res.json({ ok: true, count: 0, bills: [], warning: err.message });
  }
});

/**
 * GET /api/playtime
 * Playtime leaderboard / activity records
 */
app.get("/api/playtime", async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const [rows] = await pool.query(
      "SELECT citizenid, name, playtime, account FROM player_playtime ORDER BY playtime DESC LIMIT ?",
      [Number(limit) || 100]
    );
    res.json({ ok: true, count: rows.length, playtime: rows });
  } catch (err) {
    res.json({ ok: true, count: 0, playtime: [], warning: err.message });
  }
});

/**
 * GET /api/vehicles
 * Player and institution vehicles
 */
app.get("/api/vehicles", async (req, res) => {
  try {
    const { job, citizenid, limit = 100 } = req.query;
    let query = "SELECT id, plate, citizenid, vehicle, garage, fuel, engine, body, state, job FROM player_vehicles";
    const params = [];
    const conditions = [];
    if (job) {
      conditions.push("job = ?");
      params.push(job);
    }
    if (citizenid) {
      conditions.push("citizenid = ?");
      params.push(citizenid);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " LIMIT ?";
    params.push(Number(limit) || 100);

    const [rows] = await pool.query(query, params);
    res.json({ ok: true, count: rows.length, vehicles: rows });
  } catch (err) {
    res.json({ ok: true, count: 0, vehicles: [], warning: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Ophelia FiveM Bridge] Running on port ${PORT}`);
  console.log(`[Ophelia FiveM Bridge] Protected with X-API-Secret authentication`);
});

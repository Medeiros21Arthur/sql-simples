import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

async function initDb() {
  db = await open({
    filename: path.join(__dirname, "banco.db"),
    driver: sqlite3.Database,
  });

  // Cria a tabela caso não exista
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sobrenome TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Verifica se a coluna created_at existe (para bancos criados anteriormente)
  const columns = await db.all("PRAGMA table_info(users)");
  const hasCreatedAt = columns.some((col) => col.name === "created_at");

  if (!hasCreatedAt) {
    try {
      await db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME;");
      await db.exec("UPDATE users SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL;");
    } catch (err) {
      console.warn("Aviso ao adicionar coluna created_at:", err.message);
    }
  }

  // Preenche created_at nulos se houver registros antigos
  try {
    await db.exec("UPDATE users SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL;");
  } catch (err) {
    // Ignora se não for necessário
  }

  console.log(" Banco SQLite inicializado com sucesso.");
}

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.all("SELECT * FROM users ORDER BY id DESC");
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single user
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST new user
app.post("/api/users", async (req, res) => {
  try {
    const { nome, sobrenome } = req.body || {};
    if (!nome || !sobrenome || !nome.trim() || !sobrenome.trim()) {
      return res.status(400).json({
        success: false,
        error: "Por favor, preencha nome e sobrenome.",
      });
    }

    const result = await db.run(
      "INSERT INTO users (nome, sobrenome, created_at) VALUES (?, ?, datetime('now', 'localtime'))",
      [nome.trim(), sobrenome.trim()]
    );

    const newUser = await db.get("SELECT * FROM users WHERE id = ?", [result.lastID]);
    res.status(201).json({
      success: true,
      data: newUser,
      message: "Usuário cadastrado com sucesso!",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update user
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sobrenome } = req.body || {};

    if (!nome || !sobrenome || !nome.trim() || !sobrenome.trim()) {
      return res.status(400).json({
        success: false,
        error: "Por favor, informe nome e sobrenome.",
      });
    }

    const existingUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    await db.run(
      "UPDATE users SET nome = ?, sobrenome = ? WHERE id = ?",
      [nome.trim(), sobrenome.trim(), id]
    );

    const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    res.json({
      success: true,
      data: updatedUser,
      message: `Usuário #${id} atualizado com sucesso!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    await db.run("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true, message: `Usuário ${user.nome} removido com sucesso!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function openBrowser(url) {
  const startCmd =
    process.platform === "win32"
      ? `start ${url}`
      : process.platform === "darwin"
      ? `open ${url}`
      : `xdg-open ${url}`;
  exec(startCmd, () => {});
}

async function start() {
  await initDb();
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Servidor rodando em: ${url}`);
    
    if (process.env.OPEN_BROWSER !== "false") {
      openBrowser(url);
    }
  });
}

start();


import express from "express";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servir frontend compilado (dist) ou pasta public
const distPath = path.join(__dirname, "dist");
const publicPath = path.join(__dirname, "public");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

const dbPath = path.join(__dirname, "banco.db");
let db;

function initDb() {
  db = new DatabaseSync(dbPath);

  // Cria a tabela caso não exista
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sobrenome TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Verifica se a coluna created_at existe (para bancos criados anteriormente)
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasCreatedAt = columns.some((col) => col.name === "created_at");

  if (!hasCreatedAt) {
    try {
      db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME;");
      db.exec("UPDATE users SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL;");
    } catch (err) {
      console.warn("Aviso ao adicionar coluna created_at:", err.message);
    }
  }

  // Preenche created_at nulos se houver registros antigos
  try {
    db.exec("UPDATE users SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL;");
  } catch (err) {
    // Ignora
  }

  console.log("📦 Banco SQLite (nativo) inicializado com sucesso.");
}

// GET all users
app.get("/api/users", (req, res) => {
  try {
    const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single user
app.get("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST new user
app.post("/api/users", (req, res) => {
  try {
    const { nome, sobrenome } = req.body || {};
    if (!nome || !sobrenome || !nome.trim() || !sobrenome.trim()) {
      return res.status(400).json({
        success: false,
        error: "Por favor, preencha nome e sobrenome.",
      });
    }

    const stmt = db.prepare(
      "INSERT INTO users (nome, sobrenome, created_at) VALUES (?, ?, datetime('now', 'localtime'))"
    );
    const result = stmt.run(nome.trim(), sobrenome.trim());
    const newId = Number(result.lastInsertRowid);

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(newId);
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
app.put("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sobrenome } = req.body || {};

    if (!nome || !sobrenome || !nome.trim() || !sobrenome.trim()) {
      return res.status(400).json({
        success: false,
        error: "Por favor, informe nome e sobrenome.",
      });
    }

    const existingUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    const stmt = db.prepare("UPDATE users SET nome = ?, sobrenome = ? WHERE id = ?");
    stmt.run(nome.trim(), sobrenome.trim(), id);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
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
app.delete("/api/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true, message: `Usuário ${user.nome} removido com sucesso!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback para SPA / index.html (compatível com Express 5)
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ success: false, error: "Rota da API não encontrada." });
  }
  const distIndex = path.join(distPath, "index.html");
  const publicIndex = path.join(publicPath, "index.html");

  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else {
    res.status(404).send("Vite em execução no modo Dev. Acesse http://localhost:5173");
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

function start() {
  initDb();
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Servidor API rodando em: ${url}`);
    
    if (process.env.OPEN_BROWSER === "true") {
      openBrowser(url);
    }
  });
}

start();

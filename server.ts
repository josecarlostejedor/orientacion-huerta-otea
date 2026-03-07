import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("results.db");

// Initialize Database Table
db.exec(`
  CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    course TEXT,
    groupName TEXT,
    age INTEGER,
    routeName TEXT,
    score REAL,
    totalTime INTEGER,
    borgScale INTEGER,
    correctCount INTEGER,
    date TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Save Race Result
  app.post("/api/results", (req, res) => {
    const { firstName, lastName, course, groupName, age, routeName, score, totalTime, borgScale, correctCount, date } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO race_results (firstName, lastName, course, groupName, age, routeName, score, totalTime, borgScale, correctCount, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(firstName, lastName, course, groupName, age, routeName, score, totalTime, borgScale, correctCount, date);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving result:", error);
      res.status(500).json({ error: "Failed to save result" });
    }
  });

  // API: Export Results to CSV (Excel compatible)
  app.get("/api/results/export", (req, res) => {
    try {
      const results = db.prepare("SELECT * FROM race_results ORDER BY id DESC").all();
      
      if (results.length === 0) {
        return res.status(404).send("No hay registros todavía.");
      }

      // Create CSV content
      const headers = ["ID", "Nombre", "Apellidos", "Curso", "Grupo", "Edad", "Recorrido", "Puntuación", "Tiempo (seg)", "Escala Borg", "Aciertos", "Fecha"];
      const rows = results.map(r => [
        r.id, r.firstName, r.lastName, r.course, r.groupName, r.age, r.routeName, r.score, r.totalTime, r.borgScale, r.correctCount, r.date
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=registro_orientacion.csv");
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting results:", error);
      res.status(500).send("Error al exportar.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

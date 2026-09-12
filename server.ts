import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { runEsgCopilot } from "./src/agents/esg_agent";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to analyze invoice
  app.post("/api/analyze-invoice", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract text from PDF
      const pdfData = await pdfParse(req.file.buffer);
      const textContent = pdfData.text;

      // Pass to Gemini Agent
      const auditReport = await runEsgCopilot(textContent);

      res.json({ status: "success", audit_report: auditReport });
    } catch (error: any) {
      console.error("Error analyzing invoice:", error);
      res.status(500).json({ error: error.message || "Failed to process document." });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

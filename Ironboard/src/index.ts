import { createServer } from 'http';
import { runExecutiveDocumentationCommand } from './orchestrator.js';

// Absolute zero-drift runtime configurations
export const BOARD_ORCHESTRATION_CONFIG = {
  temperature: 0.0,
  topP: 0.0,
  isAirGapped: true,
  layout: {
    leftPane: "w-[22vw]",
    centerPane: "w-[48vw]",
    rightPane: "w-[30vw]",
    highlighting: "select-text"
  }
} as const;

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/board/deliberate' && req.method === 'POST') {
    try {
      console.log("[IRONBOARD] Activating isolated executive orchestration loop...");
      // Execute the underlying single-chapter generation loops cleanly
      await runExecutiveDocumentationCommand();
      
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: "SUCCESS", 
        message: "Executive documentation loop compiled safely into Track 1 and Track 2 assets.",
        anchors: BOARD_ORCHESTRATION_CONFIG.layout
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown orchestration failure";
      res.writeHead(500);
      res.end(JSON.stringify({ status: "CRITICAL_ERROR", diagnostics: message }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ status: "NOT_FOUND" }));
  }
});

const PORT = process.env.IRONBOARD_PORT || 8081;
server.listen(PORT, () => {
  console.log(`[IRONBOARD] Isolated executive app running securely on port ${PORT}`);
});

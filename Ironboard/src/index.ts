/**
 * IronBoard — single-file Express server
 * 17-agent boardroom · docs federation · Gemini SSE @ T=0.0
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { loadIronboardEnv, getIronboardApiKey, getIronboardGeminiModel } from './loadIronboardEnv.js';
import {
  AGENTIC_BOARD_ROSTER,
  STATIC_PRODUCTS,
  SOVEREIGN_POOL_BASELINES_CENTS,
  buildStaticContextBundle,
  resolveCanonicalDetermination,
  WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
  type BoardPersona,
} from './staticContext.js';

const PORT = Number(process.env.PORT) || 8082;
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const IRONBOARD_ROOT = path.resolve(MODULE_DIR, '..');

const BOARDROOM_DIRECTIVE =
  'You are an active, data-driven member of a 17-agent corporate Board of Directors operating under the Ironframe Constitution. You are prohibited from answering strategic business questions with generic theory or abstract jargon. When asked for target clients, strategic acquisitions, or market opportunities, you MUST return concrete, real-world company names, localized market entities, and actionable business leads. Utilize the data loaded from local markdown docs to ground your corporate directives in exact, non-speculative account execution plans. CRITICAL: Kimbot is Simulation Bot B (red-team antagonist), NOT Agent 17. Ironbloom is Agent 17 (sustainability). If federated docs conflict on Kimbot, follow the NAMING LOCK in static context.';

const VALID_AGENT_IDS = new Set(AGENTIC_BOARD_ROSTER.map(a => a.id));
const AUTO_ROUTER_ID = 'auto';

// ─── Environment ───────────────────────────────────────────────────────────────
loadIronboardEnv();

if (!process.env.GOOGLE_API_KEY && !getIronboardApiKey()) {
  console.warn('[IRONBOARD] GOOGLE_API_KEY is not set.');
} else {
  console.log('[IRONBOARD] GOOGLE_API_KEY present.');
}

// ─── Markdown docs federation ──────────────────────────────────────────────────
function resolveDocsRoot(): string {
  const candidates = [
    path.resolve(IRONBOARD_ROOT, '../docs'),
    path.resolve(process.cwd(), 'docs'),
    path.resolve(process.cwd(), '../docs'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'TAS.md'))) return dir;
  }
  return candidates[0];
}

function readDoc(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  } catch {
    return '';
  }
}

function buildDocsFederationMatrix(): string {
  const docsRoot = resolveDocsRoot();
  console.log('[IRONBOARD DOCS] Scanning', docsRoot);

  const tas = readDoc(path.join(docsRoot, 'TAS.md'));
  const trd = readDoc(path.join(docsRoot, 'stakeholders', 'technical-requirements.md'));
  const hub = readDoc(path.join(docsRoot, 'hub.md'));
  const loaded = [tas, trd, hub].filter(Boolean).length;
  console.log(`[IRONBOARD DOCS] Loaded ${loaded} markdown file(s).`);

  return [
    '═══ LOCAL DOCUMENTATION FEDERATION (READ-ONLY) ═══',
    tas ? `\n── TAS.md ──\n${tas}` : '',
    trd ? `\n── technical-requirements.md ──\n${trd}` : '',
    hub ? `\n── hub.md ──\n${hub}` : '',
    '═══ END FEDERATION ═══',
  ].join('\n');
}

const DOCS_FEDERATION = buildDocsFederationMatrix();
const STATIC_CONTEXT = buildStaticContextBundle();

// ─── 17-agent boardroom routing ────────────────────────────────────────────────
function resolveAgentId(agentId: string): string | null {
  const id = agentId.trim();
  if (id === AUTO_ROUTER_ID) return AUTO_ROUTER_ID;
  if (VALID_AGENT_IDS.has(id)) return id;
  return null;
}

function pickLeader(agentId: string, query: string): BoardPersona {
  if (agentId !== AUTO_ROUTER_ID) {
    return AGENTIC_BOARD_ROSTER.find(a => a.id === agentId) ?? AGENTIC_BOARD_ROSTER[0];
  }

  const q = query.toLowerCase();
  let best = AGENTIC_BOARD_ROSTER[0];
  let score = 0;

  for (const agent of AGENTIC_BOARD_ROSTER) {
    let s = 0;
    const slug = agent.id.replace('board-', '');
    if (q.includes(slug)) s += 5;
    for (let i = 0; i < agent.expertise.length; i++) {
      if (q.includes(agent.expertise[i].toLowerCase())) s += 3;
    }
    if ((q.includes('cfo') || q.includes('finance')) && agent.id === 'board-cfo') s += 10;
    if ((q.includes('cto') || q.includes('architecture') || q.includes('code')) && agent.id === 'board-cto') s += 10;
    if (s > score) {
      score = s;
      best = agent;
    }
  }
  return best;
}

function buildSystemInstruction(leader: BoardPersona): string {
  return [
    BOARDROOM_DIRECTIVE,
    WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
    `You are ${leader.role} (${leader.id}) on the IronBoard executive panel.`,
    `Primary framework: ${leader.primaryBookAlignment}.`,
    'Respond in 2–3 dense sentences of fluent prose. No markdown lists, no code fences.',
    STATIC_CONTEXT,
    DOCS_FEDERATION,
    WORKFORCE_VS_SIMULATION_DISAMBIGUATION,
  ].join('\n\n');
}

function writeSseToken(res: express.Response, token: string): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify({ token })}\n\n`);
}

type HistoryTurn = { role: 'user' | 'model'; text: string };

function normalizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { role?: string; text?: string; content?: string };
    const role: 'user' | 'model' = record.role === 'model' ? 'model' : 'user';
    const text = String(record.text ?? record.content ?? '').trim();
    if (!text) continue;
    out.push({ role, text });
  }
  return out;
}

function mapHistoryToGeminiContents(history: HistoryTurn[]) {
  return history.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
}

function lastUserTurnText(history: HistoryTurn[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') return history[i].text;
  }
  return history[0]?.text ?? '';
}

// ─── Dashboard HTML ────────────────────────────────────────────────────────────
function renderDashboard(): string {
  const rosterButtons = AGENTIC_BOARD_ROSTER.map(a =>
    `<button type="button" class="roster-btn" data-id="${a.id}" data-role="${a.role.replace(/"/g, '&quot;')}">
      <span class="role">${a.role}</span><span class="team">${a.team}</span>
    </button>`,
  ).join('');

  const products = STATIC_PRODUCTS.map(
    p => `<div class="product"><strong>${p.name}</strong><span>${p.priority}</span></div>`,
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Cache-Control" content="no-cache, must-revalidate">
  <title>IronBoard // 17-Agent Boardroom</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ui-monospace, monospace; background: #020617; color: #e2e8f0; min-height: 100vh; display: flex; flex-direction: column; }
    header { padding: 1rem 1.5rem; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    header h1 { font-size: 0.85rem; letter-spacing: 0.15em; text-transform: uppercase; color: #fbbf24; }
    .voice-controls { display: flex; align-items: center; gap: 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; padding: 0.35rem 0.75rem; }
    .voice-controls label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; }
    .voice-controls .slider-row { display: flex; align-items: center; gap: 0.35rem; }
    .voice-controls input[type=range] { width: 4rem; accent-color: #f59e0b; cursor: pointer; }
    .voice-controls .val { font-size: 0.6rem; font-weight: 700; color: #fbbf24; min-width: 2rem; }
    header span { font-size: 0.65rem; color: #64748b; white-space: nowrap; }
    main { flex: 1; display: grid; grid-template-columns: 28vw 1fr 26vw; min-height: 0; }
    section { border-right: 1px solid #1e293b; overflow-y: auto; padding: 1rem; }
    section:last-child { border-right: none; border-left: 1px solid #1e293b; }
    .roster-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
    .roster-btn { width: 100%; text-align: left; padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; cursor: pointer; }
    .roster-btn.roster-auto { grid-column: 1 / -1; }
    .roster-btn.active { border-color: #f59e0b; background: #451a03; }
    .roster-btn .role { display: block; font-weight: 700; font-size: 0.68rem; line-height: 1.25; }
    .roster-btn .team { display: block; font-size: 0.6rem; color: #64748b; margin-top: 0.15rem; }
    #chat-panel { display: flex; flex-direction: column; border-right: none; min-height: 0; }
    #active-label { font-size: 0.65rem; color: #fbbf24; margin-bottom: 0.75rem; flex-shrink: 0; }
    #chat-window { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; padding: 0.75rem; overflow-y: auto; min-height: 12rem; }
    .msg-user, .msg-model { padding: 0.65rem; margin-bottom: 0.5rem; border-radius: 0.35rem; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.5; }
    .msg-user { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; }
    .msg-user-label { font-size: 0.6rem; color: #fbbf24; font-weight: 800; text-transform: uppercase; margin-bottom: 0.25rem; }
    .msg-model { background: #020617; border: 1px solid #334155; border-left: 3px solid #f59e0b; color: #e2e8f0; }
    .msg-model-label { font-size: 0.6rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 0.25rem; }
    .msg-streaming { border-left-color: #fbbf24; }
    form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    textarea { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; color: #e2e8f0; padding: 0.65rem; resize: vertical; min-height: 2.75rem; font-family: inherit; }
    button[type=submit] { background: #d97706; color: #020617; border: none; border-radius: 0.35rem; padding: 0 1.25rem; font-weight: 800; cursor: pointer; }
    button[type=submit]:disabled { opacity: 0.5; cursor: not-allowed; }
    #status { font-size: 0.65rem; color: #fbbf24; margin-top: 0.5rem; min-height: 1rem; }
    .product { padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 0.35rem; margin-bottom: 0.4rem; font-size: 0.7rem; display: flex; justify-content: space-between; }
    .baseline { font-size: 0.68rem; display: flex; justify-content: space-between; padding: 0.2rem 0; color: #94a3b8; }
    .baseline span:last-child { color: #34d399; }
  </style>
</head>
<body>
  <header>
    <h1>IronBoard // 17-Agent Boardroom</h1>
    <div class="voice-controls">
      <div class="slider-row">
        <label for="voice-speed-slider">Speed</label>
        <input type="range" id="voice-speed-slider" min="0.5" max="2.5" step="0.05" value="1.00" />
        <span id="speed-val-display" class="val">1.00x</span>
      </div>
      <div class="slider-row">
        <label for="voice-pitch-slider">Pitch</label>
        <input type="range" id="voice-pitch-slider" min="0.5" max="1.5" step="0.05" value="1.00" />
        <span id="pitch-val-display" class="val">1.00</span>
      </div>
    </div>
    <span>Gemini · ${getIronboardGeminiModel()} · port ${PORT}</span>
  </header>
  <main>
    <section id="roster">
      <p style="font-size:0.65rem;color:#64748b;margin-bottom:0.5rem;text-transform:uppercase;">Board Roster (17)</p>
      <div class="roster-grid">
        <button type="button" class="roster-btn roster-auto active" data-id="auto" data-role="Auto-Routing">
          <span class="role">✨ Auto Panel Router</span><span class="team">Routes across 17 agents</span>
        </button>
        ${rosterButtons}
      </div>
    </section>
    <section id="chat-panel">
      <div id="active-label">Active: Auto-Routing</div>
      <div id="chat-window"></div>
      <form id="query-form">
        <textarea id="user-prompt" placeholder="Ask the board…" rows="2"></textarea>
        <button type="submit" id="submit-btn">Query</button>
      </form>
      <div id="status"></div>
    </section>
    <section>
      <p style="font-size:0.65rem;color:#64748b;margin-bottom:0.5rem;text-transform:uppercase;">Product Matrix</p>
      ${products}
      <div style="margin-top:1rem;font-size:0.65rem;color:#64748b;text-transform:uppercase;">Baselines (¢)</div>
      <div class="baseline"><span>Medshield</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.medshield}</span></div>
      <div class="baseline"><span>Vaultbank</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.vaultbank}</span></div>
      <div class="baseline"><span>Gridcore</span><span>${SOVEREIGN_POOL_BASELINES_CENTS.gridcore}</span></div>
    </section>
  </main>
  <script>
    var activeAgentId = 'auto';
    var activeAgentRole = 'Auto-Routing';
    var historiesByAgent = {};
    var streamingText = '';
    var cachedSpeechVoices = [];
    var VOICE_SPEED_KEY = 'ironboard_voice_speed';
    var VOICE_PITCH_KEY = 'ironboard_voice_pitch';

    function hydrateVoiceSettings() {
      var speedInput = document.getElementById('voice-speed-slider');
      var pitchInput = document.getElementById('voice-pitch-slider');
      var speedDisplay = document.getElementById('speed-val-display');
      var pitchDisplay = document.getElementById('pitch-val-display');
      var savedSpeed = localStorage.getItem(VOICE_SPEED_KEY);
      var savedPitch = localStorage.getItem(VOICE_PITCH_KEY);
      if (savedSpeed && speedInput) {
        speedInput.value = savedSpeed;
        if (speedDisplay) speedDisplay.textContent = savedSpeed + 'x';
      }
      if (savedPitch && pitchInput) {
        pitchInput.value = savedPitch;
        if (pitchDisplay) pitchDisplay.textContent = savedPitch;
      }
    }

    function bindVoiceSliders() {
      var speedInput = document.getElementById('voice-speed-slider');
      var pitchInput = document.getElementById('voice-pitch-slider');
      var speedDisplay = document.getElementById('speed-val-display');
      var pitchDisplay = document.getElementById('pitch-val-display');
      if (speedInput) {
        speedInput.addEventListener('input', function() {
          localStorage.setItem(VOICE_SPEED_KEY, speedInput.value);
          if (speedDisplay) speedDisplay.textContent = speedInput.value + 'x';
        });
      }
      if (pitchInput) {
        pitchInput.addEventListener('input', function() {
          localStorage.setItem(VOICE_PITCH_KEY, pitchInput.value);
          if (pitchDisplay) pitchDisplay.textContent = pitchInput.value;
        });
      }
    }

    function getVoiceRate() {
      var speedInput = document.getElementById('voice-speed-slider');
      var rate = speedInput ? parseFloat(speedInput.value) : parseFloat(localStorage.getItem(VOICE_SPEED_KEY) || '1');
      return Math.min(Math.max(rate, 0.5), 2.5);
    }

    function getVoicePitch() {
      var pitchInput = document.getElementById('voice-pitch-slider');
      var pitch = pitchInput ? parseFloat(pitchInput.value) : parseFloat(localStorage.getItem(VOICE_PITCH_KEY) || '1');
      return Math.min(Math.max(pitch, 0.5), 1.5);
    }

    function synthesisRate() {
      return Math.min(Math.max(getVoiceRate(), 0.75), 1.25);
    }

    function synthesisPitch() {
      return Math.min(Math.max(getVoicePitch(), 0.85), 1.15);
    }

    function prepareSpeechText(raw) {
      var t = String(raw || '');
      var out = '';
      for (var i = 0; i < t.length; i++) {
        var code = t.charCodeAt(i);
        if (code === 10 || code === 13 || code === 9) out += ' ';
        else if (code >= 32 && code !== 127) out += t.charAt(i);
      }
      var tick = String.fromCharCode(96);
      var fence = tick + tick + tick;
      out = out.split(fence).join(' ');
      out = out.split(tick).join('');
      out = out.split('**').join('');
      out = out.split('__').join('');
      out = out.split('*').join('');
      out = out.split('_').join(' ');
      out = out.split('#').join(' ');
      out = out.split('.md').join('');
      while (out.indexOf('  ') !== -1) out = out.split('  ').join(' ');
      out = out.trim();
      if (out.length > 720) {
        var cut = out.slice(0, 720);
        var dot = cut.lastIndexOf('.');
        out = dot > 280 ? cut.slice(0, dot + 1) : cut;
      }
      return out;
    }

    function refreshSpeechVoices() {
      if (!window.speechSynthesis) return;
      cachedSpeechVoices = window.speechSynthesis.getVoices();
    }

    function pickExecutiveVoice(agentRole) {
      if (!cachedSpeechVoices.length) return null;
      var english = cachedSpeechVoices.filter(function(v) {
        return (v.lang || '').toLowerCase().indexOf('en') === 0;
      });
      var pool = english.length ? english : cachedSpeechVoices;
      var prefs = ['Microsoft Jenny', 'Microsoft Aria', 'Google US English', 'Samantha', 'Daniel'];
      if (agentRole && (agentRole.indexOf('CFO') !== -1 || agentRole.indexOf('CTO') !== -1 || agentRole.indexOf('Technical') !== -1)) {
        prefs = ['Microsoft David', 'Microsoft Mark', 'Guy'];
      }
      for (var p = 0; p < prefs.length; p++) {
        var matched = pool.find(function(v) { return v.name.indexOf(prefs[p]) !== -1; });
        if (matched) return matched;
      }
      return pool.find(function(v) { return v.localService; }) || pool[0] || null;
    }

    function speakPanelText(text, agentRole) {
      if (!window.speechSynthesis) return;
      var speechText = prepareSpeechText(text);
      if (!speechText) return;
      window.speechSynthesis.cancel();
      setTimeout(function deliverSpeech() {
        refreshSpeechVoices();
        if (!cachedSpeechVoices.length) {
          setTimeout(deliverSpeech, 120);
          return;
        }
        var utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'en-US';
        utterance.rate = synthesisRate();
        utterance.pitch = synthesisPitch();
        utterance.volume = 1;
        var voice = pickExecutiveVoice(agentRole);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }, 80);
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshSpeechVoices;
    }
    hydrateVoiceSettings();
    bindVoiceSliders();
    refreshSpeechVoices();

    document.getElementById('roster').addEventListener('click', function(ev) {
      var btn = ev.target.closest('.roster-btn');
      if (!btn) return;
      document.querySelectorAll('.roster-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeAgentId = btn.getAttribute('data-id') || 'auto';
      activeAgentRole = btn.getAttribute('data-role') || 'Auto-Routing';
      document.getElementById('active-label').textContent = 'Active: ' + activeAgentRole;
      streamingText = '';
      renderChat();
    });

    function getConversationHistory() {
      if (!historiesByAgent[activeAgentId]) historiesByAgent[activeAgentId] = [];
      return historiesByAgent[activeAgentId];
    }

    function escapeHtml(value) {
      var s = String(value || '');
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (ch === '&') out += '&amp;';
        else if (ch === '<') out += '&lt;';
        else if (ch === '>') out += '&gt;';
        else if (ch === '"') out += '&quot;';
        else out += ch;
      }
      return out;
    }

    function scrollChatToBottom() {
      var chatWindow = document.getElementById('chat-window');
      if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function renderChat() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;
      var history = getConversationHistory();
      var parts = [];
      for (var i = 0; i < history.length; i++) {
        var turn = history[i];
        if (turn.role === 'user') {
          parts.push(
            '<div class="msg-user"><div class="msg-user-label">You</div>' +
            escapeHtml(turn.text) + '</div>'
          );
        } else {
          parts.push(
            '<div class="msg-model"><div class="msg-model-label">' + escapeHtml(activeAgentRole) + '</div>' +
            escapeHtml(turn.text) + '</div>'
          );
        }
      }
      if (streamingText) {
        parts.push(
          '<div class="msg-model msg-streaming"><div class="msg-model-label">' + escapeHtml(activeAgentRole) + '</div>' +
          escapeHtml(streamingText) + '</div>'
        );
      }
      chatWindow.innerHTML = parts.join('');
      scrollChatToBottom();
    }

    function setStatus(msg) {
      document.getElementById('status').textContent = msg || '';
    }

    function pushToken(token) {
      streamingText += token;
      renderChat();
    }

    function processSseBuffer(buffer) {
      var parts = buffer.split('\\n\\n');
      var remainder = parts.pop() || '';
      for (var i = 0; i < parts.length; i++) {
        var block = parts[i].trim();
        if (block.indexOf('data: ') !== 0) continue;
        var jsonStr = block.slice(6);
        if (!jsonStr) continue;
        try {
          var payload = JSON.parse(jsonStr);
          if (payload && typeof payload.token === 'string') pushToken(payload.token);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      }
      return remainder;
    }

    document.getElementById('user-prompt').addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        document.getElementById('query-form').requestSubmit();
      }
    });

    document.getElementById('query-form').addEventListener('submit', async function(ev) {
      ev.preventDefault();
      var input = document.getElementById('user-prompt');
      var submitBtn = document.getElementById('submit-btn');
      var query = input.value.trim();
      if (!query) return;

      if (window.speechSynthesis) window.speechSynthesis.cancel();
      streamingText = '';

      var conversationHistory = getConversationHistory();
      conversationHistory.push({ role: 'user', text: query });
      renderChat();

      submitBtn.disabled = true;
      setStatus('Streaming…');

      try {
        var response = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({ agentId: activeAgentId, history: conversationHistory })
        });

        if (!response.ok || !response.body) {
          throw new Error('Request failed: ' + response.status);
        }

        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var sseBuffer = '';

        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          sseBuffer += decoder.decode(chunk.value, { stream: true });
          sseBuffer = processSseBuffer(sseBuffer);
        }

        if (sseBuffer.trim()) {
          processSseBuffer(sseBuffer + '\\n\\n');
        }

        var assistantReply = streamingText;
        if (assistantReply) {
          conversationHistory.push({ role: 'model', text: assistantReply });
        }
        streamingText = '';
        renderChat();

        setStatus('Complete.');
        input.value = '';
        speakPanelText(assistantReply, activeAgentRole);
      } catch (err) {
        console.error(err);
        streamingText = '';
        renderChat();
        setStatus(err && err.message ? err.message : 'Stream failed.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

// ─── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '12mb' }));

app.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.type('html').send(renderDashboard());
});

app.post('/api/query', async (req, res) => {
  const rawAgentId = String(req.body?.agentId ?? AUTO_ROUTER_ID).trim();
  const agentId = resolveAgentId(rawAgentId);
  const history = normalizeHistory(req.body?.history);

  if (!agentId) {
    res.status(400).json({
      error: 'Invalid agentId. Must be "auto" or one of the 17 boardroom agent IDs.',
      validAgents: [...VALID_AGENT_IDS],
    });
    return;
  }

  if (history.length === 0) {
    res.status(400).json({ error: 'history must contain at least one message' });
    return;
  }

  const lastTurn = history[history.length - 1];
  if (lastTurn.role !== 'user') {
    res.status(400).json({ error: 'The last history turn must be a user message' });
    return;
  }

  const query = lastUserTurnText(history);
  const canonical = resolveCanonicalDetermination(query.toLowerCase());

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clientClosed = false;
  res.on('close', () => {
    clientClosed = true;
  });

  if (canonical) {
    writeSseToken(res, canonical);
    res.end();
    return;
  }

  const key = getIronboardApiKey();
  if (!key) {
    writeSseToken(res, 'GOOGLE_API_KEY missing. Set it in Ironboard/.env and restart.');
    res.end();
    return;
  }

  try {
    const leader = pickLeader(agentId, query);
    const ai = new GoogleGenAI({ apiKey: key });
    const stream = await ai.models.generateContentStream({
      model: getIronboardGeminiModel(),
      contents: mapHistoryToGeminiContents(history),
      config: {
        systemInstruction: buildSystemInstruction(leader),
        temperature: 0,
        topP: 0,
        tools: [{ googleSearch: {} }],
      },
    });

    for await (const chunk of stream) {
      if (clientClosed || res.writableEnded) break;
      const chunkText = chunk.text ?? '';
      if (!chunkText) continue;
      writeSseToken(res, chunkText);
    }
  } catch (err) {
    console.error('[IRONBOARD STREAM]', err);
    if (!res.writableEnded) {
      writeSseToken(res, 'Live stream faulted. Retry or verify GOOGLE_API_KEY.');
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
});

app.use((_req, res) => {
  res.status(404).json({ status: 'NOT_FOUND' });
});

const server = app.listen(PORT, () => {
  console.log(`[IRONBOARD ENGINE] Live at http://localhost:${PORT}/`);
  console.log(`[IRONBOARD ENGINE] 17-agent boardroom online · Gemini: ${getIronboardApiKey() ? 'ready' : 'offline'}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[IRONBOARD] Port ${PORT} in use. Try: $env:PORT=8083; npx tsx src/index.ts`);
    process.exit(1);
  }
  throw err;
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

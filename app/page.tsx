"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ─────────────────────────────────────────────────────────────────────────────
//  🔧 PASTE YOUR CONTRACT ADDRESS HERE AFTER DEPLOYING
// ─────────────────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "PASTE_YOUR_CONTRACT_ADDRESS_HERE";
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 4000;
const WINS_NEEDED = 3;

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Project {
  name: string;
  ticker: string;
  tagline: string;
  green_flags: string[];
  red_flags: string[];
  whitepaper_quote: string;
}

interface RoundHistory {
  round: number;
  project: Project;
  picks: Record<string, string>;
  arguments: Record<string, string>;
  outcome: "RUG" | "MOON";
  winner: string;
  verdict: string;
}

interface GameState {
  game_id: number;
  status: "waiting" | "picking" | "finished";
  players: string[];
  scores: Record<string, number>;
  current_round: number;
  current_project: Project;
  picks: Record<string, string>;
  arguments: Record<string, string>;
  round_winner: string | null;
  round_verdict: string | null;
  round_outcome: "RUG" | "MOON" | null;
  game_winner: string | null;
  history: RoundHistory[];
}

type Screen = "home" | "create" | "join" | "lobby" | "game" | "gameOver";

// ── GENLAYER HELPERS ──────────────────────────────────────────────────────────
function makeClient() {
  const account = createAccount();
  return { client: createClient({ chain: studionet, account }) };
}

async function readContract(gameId: number): Promise<GameState | null> {
  try {
    const { client } = makeClient();
    const result = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_game",
      args: [gameId],
    });
    if (!result) return null;
    return JSON.parse(result as string) as GameState;
  } catch { return null; }
}

async function readCount(): Promise<number> {
  try {
    const { client } = makeClient();
    const r = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_game_count",
      args: [],
    });
    return Number(r);
  } catch { return 0; }
}

async function writeContract(fn: string, args: unknown[]): Promise<boolean> {
  try {
    const { client } = makeClient();
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: fn,
      args,
      leaderOnly: true,
    });
    await client.waitForTransactionReceipt({
      hash, status: "ACCEPTED", retries: 60, interval: 3000,
    });
    return true;
  } catch { return false; }
}

// ── ANIMATED BG ───────────────────────────────────────────────────────────────
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #05050f 0%, #0a0818 50%, #05050f 100%)" }} />
      {/* Purple blob */}
      <div style={{ position: "absolute", width: "60vw", height: "60vw", borderRadius: "50%", top: "-15vw", right: "-10vw", background: "radial-gradient(circle, rgba(155,106,246,0.15) 0%, transparent 70%)", animation: "blob1 14s ease-in-out infinite" }} />
      {/* Blue blob */}
      <div style={{ position: "absolute", width: "50vw", height: "50vw", borderRadius: "50%", bottom: "-10vw", left: "-8vw", background: "radial-gradient(circle, rgba(17,15,255,0.12) 0%, transparent 70%)", animation: "blob2 17s ease-in-out infinite" }} />
      {/* Pink blob */}
      <div style={{ position: "absolute", width: "35vw", height: "35vw", borderRadius: "50%", top: "45%", left: "35%", background: "radial-gradient(circle, rgba(227,125,247,0.08) 0%, transparent 70%)", animation: "blob3 20s ease-in-out infinite" }} />
      {/* Data wave */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", opacity: 0.05 }} viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path d="M0,80 C360,130 720,30 1080,80 C1260,105 1380,60 1440,80 L1440,160 L0,160 Z" fill="url(#wg)" />
        <defs>
          <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9B6AF6" />
            <stop offset="50%" stopColor="#E37DF7" />
            <stop offset="100%" stopColor="#110FFF" />
          </linearGradient>
        </defs>
      </svg>
      {/* Floating GenLayer triangles */}
      {[
        { s: 28, x: 6, y: 18, o: 0.06, d: 10 },
        { s: 16, x: 88, y: 12, o: 0.05, d: 13 },
        { s: 22, x: 72, y: 65, o: 0.06, d: 9 },
        { s: 12, x: 18, y: 72, o: 0.04, d: 15 },
        { s: 18, x: 92, y: 78, o: 0.05, d: 11 },
      ].map((t, i) => (
        <svg key={i} style={{ position: "absolute", left: `${t.x}%`, top: `${t.y}%`, width: t.s, opacity: t.o, animation: `tfloat ${t.d}s ease-in-out infinite`, animationDelay: `${i * 1.5}s` }} viewBox="0 0 97.76 91.93">
          <polygon points="44.26,32.35 27.72,67.12 43.29,74.9 0,91.93 44.26,0 44.26,32.35" fill="#9B6AF6" />
          <polygon points="53.5,32.35 70.04,67.12 54.47,74.9 97.76,91.93 53.5,0 53.5,32.35" fill="#E37DF7" />
          <polygon points="48.64,43.78 58.33,62.94 48.64,67.69 39.47,62.92 48.64,43.78" fill="white" />
        </svg>
      ))}
    </div>
  );
}

// ── PROJECT CARD ──────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(155,106,246,0.2)",
      borderRadius: 20,
      padding: "1.75rem",
      display: "flex", flexDirection: "column", gap: "1.25rem",
      boxShadow: "0 0 60px rgba(155,106,246,0.08)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.5rem, 5vw, 2.2rem)", color: "white", lineHeight: 1.1 }}>
            {project.name}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem", background: "linear-gradient(135deg, #E37DF7, #9B6AF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {project.ticker}
          </div>
        </div>
        <div style={{ background: "rgba(155,106,246,0.12)", border: "1px solid rgba(155,106,246,0.25)", borderRadius: 10, padding: "0.5rem 0.9rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", fontStyle: "italic", maxWidth: 220, textAlign: "right" }}>
          "{project.tagline}"
        </div>
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, rgba(155,106,246,0.3), transparent)" }} />

      {/* Flags */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Green flags */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#4ade80", fontWeight: 700 }}>✅ Green Flags</div>
          {project.green_flags.map((f, i) => (
            <div key={i} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "flex-start", gap: "0.5rem", lineHeight: 1.4 }}>
              <span style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }}>→</span> {f}
            </div>
          ))}
        </div>
        {/* Red flags */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#f87171", fontWeight: 700 }}>🚩 Red Flags</div>
          {project.red_flags.map((f, i) => (
            <div key={i} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "flex-start", gap: "0.5rem", lineHeight: 1.4 }}>
              <span style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }}>→</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Whitepaper quote */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "0.9rem 1.1rem" }}>
        <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: "0.35rem" }}>📄 From the Whitepaper</div>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 1.6 }}>"{project.whitepaper_quote}"</p>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function RugOrMoon() {
  const [screen, setScreen] = useState<Screen>("home");
  const [playerName, setPlayerName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [gameId, setGameId] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPick, setMyPick] = useState<"RUG" | "MOON" | null>(null);
  const [myArgument, setMyArgument] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<RoundHistory | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevHistoryLen = useRef(0);

  // ── POLLING ───────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!gameId) return;
    const state = await readContract(gameId);
    if (!state) return;

    if (state.history.length > prevHistoryLen.current) {
      const latest = state.history[state.history.length - 1];
      prevHistoryLen.current = state.history.length;
      setLastResult(latest);
      setShowResult(true);
      setSubmitted(false);
      setMyPick(null);
      setMyArgument("");
    }

    if (state.status === "finished") {
      if (pollRef.current) clearInterval(pollRef.current);
    }

    setGameState(state);
  }, [gameId]);

  useEffect(() => {
    if (gameId && (screen === "lobby" || screen === "game")) {
      poll();
      pollRef.current = setInterval(poll, POLL_MS);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [gameId, screen, poll]);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === "picking" && screen === "lobby") setScreen("game");
    if (gameState.status === "finished") setScreen("gameOver");
  }, [gameState, screen]);

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!playerName.trim()) return;
    setLoading(true); setError("");
    setLoadingMsg("Cooking up a fresh rug... 🧑‍🍳");
    try {
      const countBefore = await readCount();
      const ok = await writeContract("create_game", [playerName.trim()]);
      if (!ok) throw new Error("Transaction failed");
      setGameId(countBefore + 1);
      prevHistoryLen.current = 0;
      setScreen("lobby");
    } catch { setError("Failed to create. Check connection."); }
    setLoading(false);
  }

  async function handleJoin() {
    const id = parseInt(joinId);
    if (!playerName.trim() || isNaN(id)) return;
    setLoading(true); setError("");
    setLoadingMsg("Entering the degen arena...");
    try {
      const state = await readContract(id);
      if (!state) throw new Error("Game not found");
      if (state.status !== "waiting") throw new Error("Game already started");
      if (state.players.includes(playerName.trim())) throw new Error("Name already taken");
      const ok = await writeContract("join_game", [id, playerName.trim()]);
      if (!ok) throw new Error("Transaction failed");
      setGameId(id);
      prevHistoryLen.current = 0;
      const newState = await readContract(id);
      if (newState) setGameState(newState);
      setScreen("game");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to join"); }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!myPick || !myArgument.trim() || !gameId) return;
    setLoading(true); setError("");
    setLoadingMsg("Sending your alpha to the oracle...");
    try {
      const ok = await writeContract("submit_pick", [gameId, playerName.trim(), myPick, myArgument.trim()]);
      if (!ok) throw new Error("Failed");
      setSubmitted(true);
    } catch { setError("Failed to submit. Try again."); }
    setLoading(false);
  }

  function reset() {
    setScreen("home"); setPlayerName(""); setJoinId("");
    setGameId(null); setGameState(null); setMyPick(null);
    setMyArgument(""); setSubmitted(false); setLoading(false);
    setShowResult(false); setLastResult(null);
    prevHistoryLen.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
  }

  // ── SHARED STYLES ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(155,106,246,0.25)", borderRadius: 10,
    padding: "0.85rem 1rem", color: "white", fontSize: "0.95rem",
    fontFamily: "'Switzer', 'DM Sans', sans-serif", outline: "none",
  };
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, padding: "2rem",
  };
  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "0.9rem 2rem", borderRadius: 12, border: "none", cursor: "pointer",
    fontFamily: "'Switzer', 'DM Sans', sans-serif", fontWeight: 800,
    fontSize: "0.95rem", letterSpacing: "0.04em", textTransform: "uppercase",
    background: "linear-gradient(135deg, #9B6AF6, #E37DF7)",
    color: "white", transition: "all 0.2s",
    boxShadow: "0 4px 24px rgba(155,106,246,0.3)",
  };
  const btnGhost: React.CSSProperties = {
    ...btnPrimary, background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", boxShadow: "none",
    color: "rgba(255,255,255,0.5)",
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: 'Switzer', 'DM Sans', sans-serif; }

        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-3vw,4vh) scale(1.1)} 70%{transform:translate(2vw,-2vh) scale(0.95)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(4vw,-5vh) scale(1.15)} }
        @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-5vw,4vh) scale(1.2)} }
        @keyframes tfloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(6deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.85) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes rugShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes moonFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.05)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(155,106,246,0.5)} 50%{box-shadow:0 0 0 12px rgba(155,106,246,0)} }

        .screen { animation: fadeUp 0.4s ease both; }
        .pop-in  { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

        input:focus, textarea:focus {
          border-color: rgba(155,106,246,0.6) !important;
          box-shadow: 0 0 0 3px rgba(155,106,246,0.15) !important;
          outline: none;
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }

        .btn-glow { animation: glowPulse 2.5s ease infinite; }
        .btn-glow:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(155,106,246,0.5) !important; }
        .btn-glow:active { transform: scale(0.97); }

        .pick-rug:hover  { border-color: rgba(248,113,113,0.8) !important; background: rgba(239,68,68,0.15) !important; transform: scale(1.02); }
        .pick-moon:hover { border-color: rgba(250,204,21,0.8) !important; background: rgba(234,179,8,0.1) !important; transform: scale(1.02); }

        .gradient-text {
          background: linear-gradient(135deg, #E37DF7 0%, #9B6AF6 50%, #6B8FFF 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .waiting-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background: linear-gradient(135deg, #9B6AF6, #E37DF7); animation: bounce 0.9s ease infinite; }
        .loader-ring { width:22px; height:22px; border:2.5px solid rgba(155,106,246,0.2); border-top-color:#9B6AF6; border-radius:50%; animation:spin 0.75s linear infinite; display:inline-block; flex-shrink:0; }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(155,106,246,0.3); border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", color: "white", position: "relative" }}>
        <Background />
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ── HOME ──────────────────────────────────────────────────── */}
          {screen === "home" && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "2.5rem", textAlign: "center" }}>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", opacity: 0.6 }}>
                <img src="/logo/mark.svg" alt="GenLayer" style={{ height: 24 }} />
                <span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>GenLayer</span>
              </div>

              <div>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(155,106,246,0.9)", marginBottom: "0.75rem", fontWeight: 700 }}>
                  ✦ The Web3 Degen Party Game
                </div>
                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(4rem, 15vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.02em" }}>
                  <span style={{ color: "#f87171" }}>RUG</span>
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.4em", letterSpacing: "0.1em", fontWeight: 400 }}>OR</span>
                  <br />
                  <span style={{ color: "#fbbf24" }}>MOON</span>
                </h1>
                <p style={{ marginTop: "1.25rem", fontSize: "clamp(0.95rem, 2.5vw, 1.15rem)", color: "rgba(255,255,255,0.5)", maxWidth: 460, margin: "1.25rem auto 0", lineHeight: 1.7 }}>
                  AI drops a fake crypto project. You call <strong style={{ color: "#f87171" }}>RUG 🪤</strong> or <strong style={{ color: "#fbbf24" }}>MOON 🚀</strong>.<br />
                  Argue your case. The oracle reveals the truth.
                </p>
              </div>

              {/* How it works */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", maxWidth: 680 }}>
                {[
                  { icon: "🤖", title: "AI drops a project", body: "A fake crypto project appears — with a name, ticker, green flags AND red flags. Could go either way." },
                  { icon: "🪤🚀", title: "You call it", body: "Pick RUG or MOON. Then write one sentence defending your call. The spicier the argument, the better." },
                  { icon: "⚖️", title: "Oracle decides", body: "The AI reveals the outcome based on whose argument was more convincing. First to 3 wins." },
                ].map((s) => (
                  <div key={s.title} style={{ ...card, flex: "1 1 170px", minWidth: 155, textAlign: "left", padding: "1.1rem" }}>
                    <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "rgba(155,106,246,0.9)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{s.body}</div>
                  </div>
                ))}
              </div>

              {/* Name + CTA */}
              <div style={{ ...card, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700 }}>Your Degen Name</label>
                <input style={inputStyle} placeholder="e.g. CryptoGod69" value={playerName}
                  onChange={e => setPlayerName(e.target.value)} maxLength={24}
                  onKeyDown={e => e.key === "Enter" && playerName.trim() && setScreen("create")} />
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-glow" style={{ ...btnPrimary, flex: 1 }}
                    disabled={!playerName.trim()}
                    onClick={() => { setError(""); setScreen("create"); }}>
                    ⚡ Create
                  </button>
                  <button style={{ ...btnPrimary, flex: 1, background: "rgba(155,106,246,0.15)", border: "1px solid rgba(155,106,246,0.3)", boxShadow: "none" }}
                    disabled={!playerName.trim()}
                    onClick={() => { setError(""); setScreen("join"); }}>
                    🚪 Join
                  </button>
                </div>
                {error && <div style={{ fontSize: "0.8rem", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.6rem" }}>{error}</div>}
              </div>

              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
                Powered by GenLayer · AI consensus on-chain · Not financial advice (obviously)
              </div>
            </div>
          )}

          {/* ── CREATE ────────────────────────────────────────────────── */}
          {screen === "create" && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "2rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎰</div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.2rem" }}>Start a Game</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>
                  The AI will generate a fresh fake project for you and your opponent.
                </p>
              </div>
              <div style={{ ...card, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ background: "rgba(155,106,246,0.08)", border: "1px dashed rgba(155,106,246,0.2)", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["AI cooks a fake crypto project", "You share your Game ID with a friend", "Both of you call RUG or MOON each round", "First to 3 correct calls wins"].map(t => (
                    <div key={t} style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
                      <span style={{ color: "rgba(155,106,246,0.8)" }}>→</span> {t}
                    </div>
                  ))}
                </div>
                {error && <div style={{ fontSize: "0.8rem", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.6rem" }}>{error}</div>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setError(""); setScreen("home"); }}>← Back</button>
                  <button className="btn-glow" style={{ ...btnPrimary, flex: 2 }} disabled={loading} onClick={handleCreate}>
                    {loading ? <><span className="loader-ring" /> {loadingMsg}</> : "🎰 Create Game"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── JOIN ──────────────────────────────────────────────────── */}
          {screen === "join" && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "2rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🚪</div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.2rem" }}>Join a Game</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>Ask your opponent for their Game ID</p>
              </div>
              <div style={{ ...card, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700 }}>Game ID</label>
                <input style={{ ...inputStyle, fontSize: "1.8rem", textAlign: "center", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}
                  type="number" placeholder="e.g. 7" value={joinId} onChange={e => setJoinId(e.target.value)} />
                {error && <div style={{ fontSize: "0.8rem", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.6rem" }}>{error}</div>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setError(""); setScreen("home"); }}>← Back</button>
                  <button className="btn-glow" style={{ ...btnPrimary, flex: 2 }} disabled={loading || !joinId} onClick={handleJoin}>
                    {loading ? <><span className="loader-ring" /> {loadingMsg}</> : "🚪 Join Game"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── LOBBY ─────────────────────────────────────────────────── */}
          {screen === "lobby" && gameId && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", animation: "bounce 1.3s ease infinite" }}>⏳</div>
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.2rem" }}>Waiting for your opponent</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>Share your Game ID — they enter it on the Join screen</p>
              </div>
              <div style={{ ...card, maxWidth: 340, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <div style={{ fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700 }}>Your Game ID</div>
                <div className="gradient-text" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "5.5rem", lineHeight: 1 }}>{gameId}</div>
                <button style={{ ...btnPrimary, background: "rgba(155,106,246,0.15)", border: "1px solid rgba(155,106,246,0.3)", boxShadow: "none", padding: "0.5rem 1.2rem", fontSize: "0.82rem" }}
                  onClick={() => navigator.clipboard.writeText(String(gameId))}>
                  📋 Copy ID
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
                {[0, 0.2, 0.4].map(d => <span key={d} className="waiting-dot" style={{ animationDelay: `${d}s` }} />)}
                <span style={{ marginLeft: "0.5rem" }}>Checking every 4 seconds...</span>
              </div>
            </div>
          )}

          {/* ── GAME ──────────────────────────────────────────────────── */}
          {screen === "game" && gameState && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "1.5rem 1rem", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>

              {/* Nav */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <img src="/logo/mark.svg" alt="GenLayer" style={{ height: 20, opacity: 0.6 }} />
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1rem", letterSpacing: "0.06em" }}>
                    <span style={{ color: "#f87171" }}>RUG</span> <span style={{ color: "rgba(255,255,255,0.3)" }}>OR</span> <span style={{ color: "#fbbf24" }}>MOON</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,106,246,0.9)", background: "rgba(155,106,246,0.12)", border: "1px solid rgba(155,106,246,0.25)", padding: "0.2rem 0.6rem", borderRadius: 999, fontWeight: 700 }}>
                    Round {gameState.current_round}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", padding: "0.2rem 0.6rem" }}>#{gameId}</span>
                </div>
              </div>

              {/* Scoreboard */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                {gameState.players.map(p => {
                  const score = gameState.scores[p] || 0;
                  const isMe = p === playerName;
                  return (
                    <div key={p} style={{ flex: "1 1 160px", background: isMe ? "rgba(155,106,246,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isMe ? "rgba(155,106,246,0.35)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p}</div>
                        {isMe && <div style={{ fontSize: "0.62rem", color: "rgba(155,106,246,0.8)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>You</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2rem", background: "linear-gradient(135deg, #E37DF7, #9B6AF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>{score}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {Array.from({ length: WINS_NEEDED }).map((_, i) => (
                            <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < score ? "linear-gradient(135deg, #E37DF7, #9B6AF6)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(155,106,246,0.3)", transition: "all 0.3s" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Project card */}
              {gameState.current_project && <ProjectCard project={gameState.current_project} />}

              {/* Pick buttons + argument */}
              {!submitted ? (
                <div style={{ ...card, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700 }}>
                    What's your call?
                  </div>

                  {/* RUG / MOON pick buttons */}
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button className="pick-rug" onClick={() => setMyPick("RUG")} style={{
                      flex: 1, padding: "1.25rem", borderRadius: 14, border: `2px solid ${myPick === "RUG" ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.1)"}`,
                      background: myPick === "RUG" ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                      boxShadow: myPick === "RUG" ? "0 0 30px rgba(239,68,68,0.2)" : "none",
                    }}>
                      <div style={{ fontSize: "2.5rem", animation: myPick === "RUG" ? "rugShake 0.5s ease" : "none" }}>🪤</div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.5rem", color: myPick === "RUG" ? "#f87171" : "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>RUG</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>It's going to zero</div>
                    </button>
                    <button className="pick-moon" onClick={() => setMyPick("MOON")} style={{
                      flex: 1, padding: "1.25rem", borderRadius: 14, border: `2px solid ${myPick === "MOON" ? "rgba(250,204,21,0.9)" : "rgba(255,255,255,0.1)"}`,
                      background: myPick === "MOON" ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                      boxShadow: myPick === "MOON" ? "0 0 30px rgba(234,179,8,0.18)" : "none",
                    }}>
                      <div style={{ fontSize: "2.5rem", animation: myPick === "MOON" ? "moonFloat 1s ease infinite" : "none" }}>🚀</div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "1.5rem", color: myPick === "MOON" ? "#fbbf24" : "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>MOON</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>We're all gonna make it</div>
                    </button>
                  </div>

                  {/* Argument */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(155,106,246,0.7)", fontWeight: 700 }}>
                      Why? Drop your alpha (1-2 sentences)
                    </label>
                    <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
                      placeholder={myPick === "RUG" ? "e.g. The liquidity is locked for 24 hours, the team is anon, and the whitepaper was written in Comic Sans. Classic rug setup." : myPick === "MOON" ? "e.g. CertiK audit + Binance listing rumour = we're going parabolic. Degens don't read red flags." : "Pick RUG or MOON first, then explain your call..."}
                      value={myArgument} maxLength={280}
                      onChange={e => setMyArgument(e.target.value)} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>{myArgument.length}/280</span>
                      {error && <span style={{ fontSize: "0.75rem", color: "#f87171" }}>{error}</span>}
                    </div>
                  </div>

                  <button className="btn-glow" style={{ ...btnPrimary, opacity: (!myPick || !myArgument.trim() || loading) ? 0.5 : 1 }}
                    disabled={!myPick || !myArgument.trim() || loading}
                    onClick={handleSubmit}>
                    {loading ? <><span className="loader-ring" /> {loadingMsg}</> : `Submit ${myPick === "RUG" ? "🪤 RUG" : myPick === "MOON" ? "🚀 MOON" : "your call"}`}
                  </button>
                </div>
              ) : (
                <div style={{ ...card, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", background: "rgba(155,106,246,0.05)", border: "1px solid rgba(155,106,246,0.2)" }}>
                  <div style={{ fontSize: "2.5rem" }}>📡</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1rem" }}>
                      You called {myPick === "RUG" ? <span style={{ color: "#f87171" }}>RUG 🪤</span> : <span style={{ color: "#fbbf24" }}>MOON 🚀</span>}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "0.3rem" }}>Waiting for the other player... then the oracle speaks.</p>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 0.2, 0.4].map(d => <span key={d} className="waiting-dot" style={{ animationDelay: `${d}s` }} />)}
                  </div>
                </div>
              )}

              {/* Round history */}
              {gameState.history.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>Previous Rounds</div>
                  {[...gameState.history].reverse().map(h => (
                    <div key={h.round} style={{ borderLeft: `2px solid ${h.outcome === "RUG" ? "rgba(248,113,113,0.4)" : "rgba(251,191,36,0.4)"}`, paddingLeft: "0.9rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>Round {h.round}</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: h.outcome === "RUG" ? "#f87171" : "#fbbf24" }}>{h.outcome === "RUG" ? "🪤 RUGGED" : "🚀 MOONED"}</span>
                        <span style={{ fontSize: "0.68rem", color: "rgba(155,106,246,0.9)", background: "rgba(155,106,246,0.12)", border: "1px solid rgba(155,106,246,0.2)", padding: "0.1rem 0.4rem", borderRadius: 999, fontWeight: 700 }}>🏆 {h.winner}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>"{h.verdict}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── GAME OVER ──────────────────────────────────────────────── */}
          {screen === "gameOver" && gameState && (
            <div className="screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "5rem", animation: "bounce 0.9s ease infinite" }}>
                {gameState.game_winner === playerName ? "🏆" : "💀"}
              </div>
              <div>
                <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700, marginBottom: "0.4rem" }}>Game Over</div>
                <h2 className={gameState.game_winner === playerName ? "gradient-text" : ""} style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(2.5rem, 9vw, 5rem)", lineHeight: 1, color: gameState.game_winner === playerName ? undefined : "rgba(255,255,255,0.35)" }}>
                  {gameState.game_winner === playerName ? "Ngmi → Gmi 🎉" : `${gameState.game_winner} has more alpha`}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.5rem" }}>
                  {gameState.game_winner === playerName ? "Your degen senses are unmatched. The oracle bows." : "Your bags are heavy but your spirit is not. Study the charts."}
                </p>
              </div>

              {/* Final scores */}
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                {gameState.players.map(p => {
                  const isWinner = p === gameState.game_winner;
                  return (
                    <div key={p} style={{ ...card, minWidth: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", border: isWinner ? "1px solid rgba(155,106,246,0.5)" : "1px solid rgba(255,255,255,0.08)", boxShadow: isWinner ? "0 0 40px rgba(155,106,246,0.15)" : "none" }}>
                      {isWinner && <div style={{ fontSize: "1.2rem" }}>👑</div>}
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p}</div>
                      <div className={isWinner ? "gradient-text" : ""} style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "3rem", lineHeight: 1, color: isWinner ? undefined : "rgba(255,255,255,0.3)" }}>
                        {gameState.scores[p] || 0}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>correct calls</div>
                    </div>
                  );
                })}
              </div>

              {/* History */}
              {gameState.history.length > 0 && (
                <div style={{ ...card, width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: 260, overflowY: "auto" }}>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>Match History</div>
                  {gameState.history.map(h => (
                    <div key={h.round} style={{ borderLeft: `2px solid ${h.outcome === "RUG" ? "rgba(248,113,113,0.35)" : "rgba(251,191,36,0.35)"}`, paddingLeft: "0.8rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>Round {h.round} · {h.project?.name}</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: h.outcome === "RUG" ? "#f87171" : "#fbbf24" }}>{h.outcome === "RUG" ? "🪤 RUGGED" : "🚀 MOONED"}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>"{h.verdict}"</p>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-glow" style={{ ...btnPrimary, padding: "1rem 2.5rem", fontSize: "1rem" }} onClick={reset}>
                🎰 Play Again
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", opacity: 0.3 }}>
                <img src="/logo/mark.svg" alt="" style={{ height: 14 }} />
                <span style={{ fontSize: "0.6rem", letterSpacing: "0.12em" }}>POWERED BY GENLAYER</span>
              </div>
            </div>
          )}

          {/* ── ROUND RESULT OVERLAY ──────────────────────────────────── */}
          {showResult && lastResult && (
            <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(5,5,15,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", animation: "fadeIn 0.3s ease both" }}
              onClick={() => setShowResult(false)}>
              <div className="pop-in" onClick={e => e.stopPropagation()} style={{
                width: "100%", maxWidth: 500, padding: "2.5rem",
                background: "linear-gradient(145deg, #0a0818, #0f0d1f)",
                border: `2px solid ${lastResult.outcome === "RUG" ? "rgba(248,113,113,0.5)" : "rgba(250,204,21,0.5)"}`,
                borderRadius: 22, textAlign: "center",
                boxShadow: `0 0 80px ${lastResult.outcome === "RUG" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.12)"}, 0 40px 80px rgba(0,0,0,0.7)`,
              }}>
                {/* Big outcome */}
                <div style={{ fontSize: "4rem", marginBottom: "0.5rem", animation: lastResult.outcome === "RUG" ? "rugShake 0.6s ease" : "moonFloat 1.5s ease infinite" }}>
                  {lastResult.outcome === "RUG" ? "🪤" : "🚀"}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.8rem", color: lastResult.outcome === "RUG" ? "#f87171" : "#fbbf24", lineHeight: 1, marginBottom: "0.25rem" }}>
                  {lastResult.outcome === "RUG" ? "IT RUGGED" : "TO THE MOON"}
                </div>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "1.5rem" }}>
                  {lastResult.project?.name} ({lastResult.project?.ticker}) — Round {lastResult.round}
                </div>

                {/* Who won */}
                <div style={{ background: "rgba(155,106,246,0.08)", border: "1px solid rgba(155,106,246,0.2)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(155,106,246,0.8)", fontWeight: 700, marginBottom: "0.3rem" }}>
                    {lastResult.winner === playerName ? "🏆 You called it!" : `🏆 ${lastResult.winner} called it!`}
                  </div>
                  {/* Show what each player picked */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                    {gameState?.players.map(p => (
                      <div key={p} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                        <span style={{ fontWeight: 700, color: "white" }}>{p}</span> called{" "}
                        <span style={{ fontWeight: 800, color: lastResult.picks[p] === "RUG" ? "#f87171" : "#fbbf24" }}>
                          {lastResult.picks[p] === "RUG" ? "🪤 RUG" : "🚀 MOON"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Oracle verdict */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: "0.35rem" }}>⚖️ The Oracle Says</div>
                  <p style={{ fontStyle: "italic", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontSize: "0.92rem" }}>"{lastResult.verdict}"</p>
                </div>

                <button className="btn-glow" style={{ ...btnPrimary, width: "100%" }} onClick={() => setShowResult(false)}>
                  {gameState?.status === "finished" ? "See Final Results →" : "Next Project →"}
                </button>
              </div>
            </div>
          )}

          {/* Full-screen loading */}
          {loading && screen !== "game" && screen !== "create" && screen !== "join" && (
            <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,5,15,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", animation: "fadeIn 0.3s ease" }}>
              <span className="loader-ring" style={{ width: 48, height: 48, borderWidth: 4 }} />
              <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1.1rem", background: "linear-gradient(135deg, #E37DF7, #9B6AF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {loadingMsg}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

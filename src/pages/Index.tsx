import { useState, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

// ── Helpers ──
function parseTime(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  let c = s.trim().replace(/[hH.]/, ":").replace(/[^\d:]/g, "");
  let h: number, m: number;
  if (c.includes(":")) {
    const p = c.split(":");
    h = parseInt(p[0]);
    m = parseInt(p[1] || "0");
  } else if (c.length === 4) {
    h = parseInt(c.slice(0, 2));
    m = parseInt(c.slice(2, 4));
  } else if (c.length === 3) {
    h = parseInt(c.slice(0, 1));
    m = parseInt(c.slice(1, 3));
  } else return null;
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h + m / 60;
}

function fmtH(d: number | null | undefined): string {
  if (d == null || isNaN(d)) return "\u2014";
  const s = d < 0 ? "-" : "";
  const a = Math.abs(d);
  return `${s}${Math.floor(a)}h${Math.round((a % 1) * 60).toString().padStart(2, "0")}min`;
}

function maskHM(v: string): string {
  let d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + ":" + d.slice(2) : d;
}

// ── Compress ──
function compress(dataUrl: string, maxW = 600): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error("Imagem invalida"));
    img.onload = () => {
      const sc = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * sc),
        h = Math.round(img.height * sc);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.5));
    };
    img.src = dataUrl;
  });
}

function enhance(dataUrl: string): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = () => rej(new Error("Falha enhance"));
    img.onload = () => {
      const w = img.width,
        h = img.height;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.filter = "contrast(1.4) brightness(1.1) grayscale(1)";
      ctx.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = dataUrl;
  });
}

// ── API call via edge function ──
const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/read-timesheet`;

async function callAI(body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error || `Erro ${resp.status}`);
  }
  return data.text;
}

// ── Types ──
interface Registro {
  dia: number | string;
  me: string | null;
  ms: string | null;
  te: string | null;
  ts: string | null;
  ee: string | null;
  es: string | null;
  obs: string | null;
  tb?: number | null;
  sd?: number | null;
}

// ── Colors ──
const C = {
  bg: "#0a0a10",
  cd: "#111118",
  bd: "#1c1c28",
  ac: "#a78bfa",
  gn: "#4ade80",
  rd: "#f87171",
  yl: "#fbbf24",
  tx: "#ddd",
  dm: "#666",
  fn: "'SF Mono','Fira Code',monospace",
};

const inp: React.CSSProperties = {
  width: 48,
  background: "#181820",
  border: "1px solid #2a2a3a",
  borderRadius: 3,
  color: "#ddd",
  padding: "3px",
  fontSize: 11,
  fontFamily: C.fn,
  textAlign: "center" as const,
};

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [imgEnhanced, setImgEnhanced] = useState<string | null>(null);
  const [showEnh, setShowEnh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const [nome, setNome] = useState("");
  const [mes, setMes] = useState("");
  const [resumo, setResumo] = useState<{
    dias: number;
    tH: number;
    ext: number;
    flt: number;
    sd: number;
  } | null>(null);
  const [jornada, setJornada] = useState("07:20");
  const [doEnhance, setDoEnhance] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const onFile = useCallback((f: File | undefined) => {
    if (!f) return;
    setError(null);
    setDebug(null);
    setRegs(null);
    setResumo(null);
    setImgEnhanced(null);
    setNome("");
    setMes("");
    setApiOk(null);
    const r = new FileReader();
    r.onload = (e) => setImage(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setDebug(null);
    setApiOk(null);
    setStep("Testando API…");
    try {
      const txt = await callAI({ test: true });
      setApiOk(true);
      setDebug("Resposta: " + txt);
    } catch (e: unknown) {
      setApiOk(false);
      const msg = e instanceof Error ? e.message : String(e);
      setError("Teste falhou: " + msg);
      setDebug(e instanceof Error ? e.stack || msg : msg);
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  const calc = (rs: Registro[], j?: string) => {
    const jD = parseTime(j || jornada) || 7.333;
    let ext = 0,
      flt = 0,
      tH = 0,
      dias = 0;
    const det = rs.map((r) => {
      const me = parseTime(r.me),
        ms = parseTime(r.ms);
      const te = parseTime(r.te),
        ts = parseTime(r.ts);
      const ee = parseTime(r.ee),
        es = parseTime(r.es);
      let tb = 0;
      if (me != null && ms != null) tb += ms - me;
      if (te != null && ts != null) tb += ts - te;
      if (ee != null && es != null) tb += es - ee;
      const tbFinal: number | null = tb <= 0 || tb > 20 ? null : tb;
      let sd: number | null = null;
      if (tbFinal != null) {
        sd = tbFinal - jD;
        if (sd > 0) ext += sd;
        else if (sd < 0) flt += sd;
        tH += tbFinal;
        dias++;
      }
      return { ...r, tb: tbFinal, sd };
    });
    setRegs(det);
    setResumo({ dias, tH, ext, flt, sd: ext + flt });
  };

  const run = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setDebug(null);
    setRegs(null);
    setResumo(null);
    let currentStep = "Comprimindo…";
    try {
      setStep(currentStep);
      let img = await compress(image, 600);

      if (doEnhance) {
        currentStep = "Melhorando...";
        setStep(currentStep);
        img = await enhance(img);
        setImgEnhanced(img);
      }

      const b64 = img.split(",")[1];
      const kb = Math.round((b64.length * 0.75) / 1024);
      currentStep = `Enviando (${kb}KB)...`;
      setStep(currentStep);

      const text = await callAI({ image: b64 });
      setDebug(text);
      currentStep = "Processando...";
      setStep(currentStep);

      const clean = text.replace(/```json|```/g, "").trim();
      const m = clean.match(/\{[\s\S]*\}/);
      if (!m) {
        setError("IA não retornou JSON");
        return;
      }
      const p = JSON.parse(m[0]);
      if (p.error) {
        setError(p.error);
        return;
      }
      if (p.nome) setNome(p.nome);
      if (p.mes) setMes(p.mes);
      if (p.registros?.length > 0) {
        calc(p.registros);
      } else {
        setError("Nenhum registro encontrado");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`[${currentStep}] ${msg}`);
      setDebug(e instanceof Error ? e.stack || msg : msg);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  const upd = (i: number, f: string, v: string) => {
    if (!regs) return;
    const u = [...regs];
    u[i] = { ...u[i], [f]: v || null };
    setRegs(u);
  };

  const recalc = () => {
    setEditMode(false);
    if (regs) calc(regs);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: C.fn }}>
      <div
        style={{
          background: "linear-gradient(135deg,#0f0a1a,#1a0f2e)",
          borderBottom: `1px solid ${C.bd}`,
          padding: "16px 20px",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.ac }}>
            FOLHA DE PONTO
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.dm }}>
            Upload → IA lê horários → Calcula extras e faltas
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px" }}>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {image ? (
          <div
            style={{
              background: C.cd,
              border: `2px solid ${C.ac}`,
              borderRadius: 10,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <img
              src={showEnh && imgEnhanced ? imgEnhanced : image}
              alt=""
              style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }}
            />
            {imgEnhanced && (
              <button
                onClick={() => setShowEnh(!showEnh)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,.7)",
                  color: C.ac,
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 7px",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: C.fn,
                }}
              >
                {showEnh ? "Original" : "Processada"}
              </button>
            )}
            <button
              onClick={() => ref.current?.click()}
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                background: "rgba(0,0,0,.7)",
                color: C.dm,
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: C.fn,
              }}
            >
              Trocar
            </button>
          </div>
        ) : (
          <div
            style={{
              background: C.cd,
              border: `2px dashed ${C.bd}`,
              borderRadius: 10,
              padding: "30px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 6, opacity: 0.5 }}>📷</div>
            <button
              onClick={() => ref.current?.click()}
              style={{
                background: C.ac,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "11px 26px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: C.fn,
              }}
            >
              Escolher Foto
            </button>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={run}
            disabled={!image || loading}
            style={{
              background: image && !loading ? C.ac : "#2a2a2a",
              color: image && !loading ? "#000" : "#555",
              border: "none",
              borderRadius: 7,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: image && !loading ? "pointer" : "not-allowed",
              fontFamily: C.fn,
            }}
          >
            {loading ? step || "..." : "Ler Folha de Ponto"}
          </button>
          <button
            onClick={testApi}
            disabled={loading}
            style={{
              background: "#1a1a22",
              color: C.dm,
              border: `1px solid ${C.bd}`,
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 11,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: C.fn,
            }}
          >
            {apiOk === true ? "API OK ✓" : apiOk === false ? "API Falhou ✗" : "Testar API"}
          </button>
          <label
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.dm, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={doEnhance}
              onChange={(e) => setDoEnhance(e.target.checked)}
              style={{ accentColor: C.ac }}
            />
            Melhorar
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: C.dm }}>Jornada:</span>
            <input
              type="text"
              value={jornada}
              onChange={(e) => setJornada(maskHM(e.target.value))}
              maxLength={5}
              style={{
                width: 44,
                background: "#181820",
                border: `1px solid ${C.bd}`,
                borderRadius: 4,
                color: C.tx,
                padding: "4px",
                fontSize: 11,
                fontFamily: C.fn,
                textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: C.cd,
              borderRadius: 7,
              border: `1px solid ${C.bd}`,
              textAlign: "center",
            }}
          >
            <p style={{ color: C.dm, fontSize: 11, margin: 0 }}>{step}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              background: "#1a0808",
              border: "1px solid #3a1515",
              borderRadius: 6,
              color: C.rd,
              fontSize: 12,
            }}
          >
            {error}
            {debug && (
              <>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  style={{
                    display: "block",
                    marginTop: 4,
                    background: "none",
                    border: "none",
                    color: C.dm,
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: C.fn,
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  {showDebug ? "Esconder" : "Detalhes"}
                </button>
                {showDebug && (
                  <pre
                    style={{
                      marginTop: 4,
                      fontSize: 9,
                      color: "#666",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: 120,
                      overflow: "auto",
                    }}
                  >
                    {debug}
                  </pre>
                )}
              </>
            )}
          </div>
        )}

        {/* API OK feedback */}
        {apiOk === true && !error && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "#081a08",
              border: "1px solid #153a15",
              borderRadius: 6,
              color: C.gn,
              fontSize: 12,
            }}
          >
            API funcionando. Agora clique "Ler Folha de Ponto".
            {debug && <span style={{ color: C.dm, fontSize: 10, marginLeft: 8 }}>{debug}</span>}
          </div>
        )}

        {/* Info */}
        {(nome || mes) && (
          <div
            style={{
              marginTop: 14,
              padding: "7px 10px",
              background: "#0f0f1a",
              border: `1px solid ${C.bd}`,
              borderRadius: 6,
              fontSize: 11,
              display: "flex",
              gap: 12,
            }}
          >
            {nome && (
              <span style={{ color: C.ac }}>
                Nome: <span style={{ color: C.tx }}>{nome}</span>
              </span>
            )}
            {mes && (
              <span style={{ color: C.ac }}>
                Mes: <span style={{ color: C.tx }}>{mes}</span>
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        {resumo && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
              gap: 7,
              marginTop: 12,
            }}
          >
            {[
              { l: "Dias", v: resumo.dias, c: C.tx },
              { l: "Total", v: fmtH(resumo.tH), c: C.ac },
              { l: "Extras", v: fmtH(resumo.ext), c: C.gn },
              { l: "Atraso", v: fmtH(Math.abs(resumo.flt)), c: C.rd },
              { l: "Saldo", v: fmtH(resumo.sd), c: resumo.sd >= 0 ? C.gn : C.rd },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  background: C.cd,
                  border: `1px solid ${C.bd}`,
                  borderRadius: 6,
                  padding: "10px 8px",
                }}
              >
                <div style={{ fontSize: 9, color: C.dm, marginBottom: 3, textTransform: "uppercase" }}>
                  {x.l}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {regs && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.dm }}>{regs.length} dias</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => (editMode ? recalc() : setEditMode(true))}
                  style={{
                    background: editMode ? C.gn : "#181820",
                    color: editMode ? "#000" : C.dm,
                    border: `1px solid ${editMode ? C.gn : C.bd}`,
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: C.fn,
                    fontWeight: 600,
                  }}
                >
                  {editMode ? "Recalcular" : "Editar"}
                </button>
                {debug && (
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    style={{
                      background: "#181820",
                      color: C.dm,
                      border: `1px solid ${C.bd}`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: 10,
                      cursor: "pointer",
                      fontFamily: C.fn,
                    }}
                  >
                    {showDebug ? "Esconder" : "JSON"}
                  </button>
                )}
              </div>
            </div>
            {showDebug && !error && (
              <pre
                style={{
                  background: "#080810",
                  border: `1px solid ${C.bd}`,
                  borderRadius: 4,
                  padding: 6,
                  fontSize: 9,
                  overflow: "auto",
                  maxHeight: 120,
                  marginBottom: 6,
                  color: "#555",
                }}
              >
                {debug}
              </pre>
            )}
            <div style={{ overflowX: "auto", background: C.cd, borderRadius: 6, border: `1px solid ${C.bd}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 750 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
                    <th style={{ padding: "5px", fontSize: 9, color: C.dm }}></th>
                    <th
                      colSpan={2}
                      style={{
                        padding: "5px",
                        fontSize: 9,
                        color: C.ac,
                        textAlign: "center",
                        borderLeft: `1px solid ${C.bd}`,
                      }}
                    >
                      MANHÃ
                    </th>
                    <th
                      colSpan={2}
                      style={{
                        padding: "5px",
                        fontSize: 9,
                        color: C.ac,
                        textAlign: "center",
                        borderLeft: `1px solid ${C.bd}`,
                      }}
                    >
                      TARDE
                    </th>
                    <th
                      colSpan={2}
                      style={{
                        padding: "5px",
                        fontSize: 9,
                        color: C.ac,
                        textAlign: "center",
                        borderLeft: `1px solid ${C.bd}`,
                      }}
                    >
                      EXTRA
                    </th>
                    <th colSpan={3} style={{ borderLeft: `1px solid ${C.bd}` }}></th>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 9 }}>
                    {["Dia", "Ent", "Sai", "Ent", "Sai", "Ent", "Sai", "Trab", "Saldo", "Obs"].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "4px",
                          textAlign: "center",
                          borderLeft: [1, 3, 5, 7].includes(i) ? `1px solid ${C.bd}` : "none",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r, i) => {
                    const ob = (r.obs || "").toUpperCase();
                    const isFt = ob.includes("FALTA") || ob.includes("AUSENT");
                    const isFg = ob.includes("FOLGA") || ob.includes("FERIADO");
                    const oC = isFt ? C.rd : isFg ? C.gn : ob ? C.yl : "#333";
                    const bg = isFt ? "#150808" : isFg ? "#081508" : "transparent";
                    const fs = ["me", "ms", "te", "ts", "ee", "es"] as const;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.bd}`, background: bg }}>
                        <td
                          style={{
                            padding: "4px 5px",
                            textAlign: "center",
                            fontWeight: 600,
                            color: C.ac,
                            fontSize: 10,
                          }}
                        >
                          {editMode ? (
                            <input
                              value={r.dia || ""}
                              onChange={(e) => upd(i, "dia", e.target.value)}
                              style={{ ...inp, width: 26 }}
                            />
                          ) : (
                            r.dia
                          )}
                        </td>
                        {fs.map((f, fi) => {
                          const v = r[f];
                          const bad = v ? parseTime(v) === null : false;
                          return (
                            <td
                              key={f}
                              style={{
                                padding: "4px 3px",
                                textAlign: "center",
                                borderLeft: [0, 2, 4].includes(fi) ? `1px solid ${C.bd}` : "none",
                              }}
                            >
                              {editMode ? (
                                <input
                                  value={v || ""}
                                  onChange={(e) => upd(i, f, e.target.value)}
                                  style={{ ...inp, ...(bad ? { borderColor: C.rd } : {}) }}
                                  placeholder="--:--"
                                />
                              ) : v ? (
                                <span style={bad ? { color: C.rd } : {}}>{v}</span>
                              ) : (
                                <span style={{ color: "#222" }}>{"\u2014"}</span>
                              )}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            padding: "4px 3px",
                            textAlign: "center",
                            fontWeight: 600,
                            fontSize: 10,
                            borderLeft: `1px solid ${C.bd}`,
                          }}
                        >
                          {r.tb != null ? fmtH(r.tb) : "\u2014"}
                        </td>
                        <td style={{ padding: "4px 3px", textAlign: "center" }}>
                          {r.sd != null ? (
                            <span
                              style={{
                                background:
                                  r.sd > 0.01 ? "#0f2a1a" : r.sd < -0.01 ? "#2a0f0f" : "#1a1a1a",
                                color: r.sd > 0.01 ? C.gn : r.sd < -0.01 ? C.rd : "#555",
                                padding: "1px 5px",
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {r.sd > 0 ? "+" : ""}
                              {fmtH(r.sd)}
                            </span>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td
                          style={{
                            padding: "4px 3px",
                            textAlign: "center",
                            fontSize: 9,
                            color: oC,
                            fontWeight: isFt || isFg ? 700 : 400,
                          }}
                        >
                          {editMode ? (
                            <input
                              value={r.obs || ""}
                              onChange={(e) => upd(i, "obs", e.target.value)}
                              style={{ ...inp, width: 50 }}
                            />
                          ) : (
                            r.obs || "\u2014"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!regs && !loading && (
          <div
            style={{
              marginTop: 20,
              padding: 14,
              background: C.cd,
              borderRadius: 7,
              border: `1px solid ${C.bd}`,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 12, color: C.ac }}>Como usar</h3>
            <div style={{ fontSize: 11, color: C.dm, lineHeight: 1.7 }}>
              <p style={{ margin: "0 0 3px" }}>1. Clique "Testar API" primeiro pra confirmar conexão</p>
              <p style={{ margin: "0 0 3px" }}>2. Envie a foto da folha de ponto</p>
              <p style={{ margin: "0 0 3px" }}>3. Clique "Ler Folha de Ponto"</p>
              <p style={{ margin: 0 }}>4. Confira e edite se necessário</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

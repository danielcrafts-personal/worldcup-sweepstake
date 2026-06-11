"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FlagImg } from "@/components/FlagImg";
import { fmtDate } from "@/lib/format";
import type { TournamentData, TrafficStats } from "@/lib/types";

type Row = { id: number; name: string; team: string };
type Note = { msg: string; err?: boolean };

export default function SettingsPage() {
  const [admin, setAdmin] = useState(false);
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [data, setData] = useState<TournamentData | null>(null);

  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const idRef = useRef(1);
  const importRef = useRef<HTMLInputElement>(null);
  const [prize1, setPrize1] = useState("");
  const [prize2, setPrize2] = useState("");
  const [res1, setRes1] = useState("");
  const [res2, setRes2] = useState("");
  const [koChecked, setKoChecked] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<TrafficStats | null>(null);

  const [toast, setToast] = useState<Note | null>(null);
  const [msgs, setMsgs] = useState<Record<string, Note>>({});

  function showToast(msg: string, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2500);
  }
  function setMsg(key: string, msg: string, err = false) {
    setMsgs((m) => ({ ...m, [key]: { msg, err } }));
    if (!err) setTimeout(() => setMsgs((m) => ({ ...m, [key]: { msg: "" } })), 3000);
  }

  async function load() {
    const t: TournamentData = await fetch("/api/tournament").then((r) => r.json());
    setData(t);
    setTitle(t.title || "");
    const newRows: Row[] = [];
    Object.entries(t.assignments).forEach(([name, teams]) => {
      (Array.isArray(teams) ? teams : [teams]).forEach((team) => newRows.push({ id: idRef.current++, name, team }));
    });
    if (newRows.length === 0) newRows.push({ id: idRef.current++, name: "", team: "" });
    setRows(newRows);
    setPrize1(t.prizes.first ? String(t.prizes.first) : "");
    setPrize2(t.prizes.second ? String(t.prizes.second) : "");
    setRes1(t.results.first || "");
    setRes2(t.results.second || "");
    setKoChecked(new Set(t.eliminated));
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/session").then((r) => r.json()).catch(() => ({ admin: false }));
      if (s.admin) {
        setAdmin(true);
        await load();
      }
    })();
  }, []);

  async function login() {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) {
      setAdmin(true);
      setLoginErr("");
      await load();
    } else setLoginErr("Wrong password. Try again.");
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setAdmin(false);
    setPw("");
    setData(null);
  }

  const teams = data?.teams || [];
  const groups = data?.groups || {};

  function usedByOthers(id: number): Set<string> {
    return new Set(rows.filter((r) => r.id !== id && r.team).map((r) => r.team));
  }
  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { id: idRef.current++, name: "", team: "" }]);
  }
  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function buildGrouped(): { grouped: Record<string, string[]>; hasPartial: boolean } {
    const grouped: Record<string, string[]> = {};
    let hasPartial = false;
    for (const r of rows) {
      const name = r.name.trim();
      if (name && r.team) (grouped[name] ||= []).push(r.team);
      else if (name || r.team) hasPartial = true;
    }
    return { grouped, hasPartial };
  }

  function exportAssignments() {
    const { grouped } = buildGrouped();
    if (Object.keys(grouped).length === 0) {
      setMsg("assign", "Nothing to export yet.", true);
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sweepstake-assignments-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Exported ✓");
  }

  async function importAssignments(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setMsg("assign", "Couldn't read that file — is it valid JSON?", true);
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setMsg("assign", 'Expected a JSON object like { "Mum": ["Brazil"] }.', true);
      return;
    }
    const known = new Set(teams);
    const newRows: Row[] = [];
    const skipped: string[] = [];
    for (const [person, val] of Object.entries(parsed as Record<string, unknown>)) {
      const list = Array.isArray(val) ? val : [val];
      for (const team of list) {
        if (person.trim() && typeof team === "string" && known.has(team)) {
          newRows.push({ id: idRef.current++, name: person, team });
        } else {
          skipped.push(`${person}: ${String(team)}`);
        }
      }
    }
    if (newRows.length === 0) {
      setMsg("assign", "No valid assignments found in that file.", true);
      return;
    }
    setRows(newRows);
    showToast("Imported ✓");
    setMsg(
      "assign",
      `Loaded ${newRows.length} assignment(s)${skipped.length ? `, skipped ${skipped.length} unknown` : ""}. Review, then click Save Assignments.`
    );
  }

  async function saveAssignments() {
    const { grouped, hasPartial } = buildGrouped();
    if (hasPartial) {
      setMsg("assign", "Each row needs both a name and a team.", true);
      return;
    }
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: grouped }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast("Assignments saved ✓");
      setMsg("assign", "Saved!");
    } else setMsg("assign", d.error || "Save failed.", true);
  }

  async function saveTitle() {
    const res = await fetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      if (d.title) setTitle(d.title);
      showToast("Title saved ✓");
      setMsg("title", "Saved! Reload the dashboard to see it.");
    } else setMsg("title", d.error || "Save failed.", true);
  }

  async function savePrizes() {
    const res = await fetch("/api/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first: Number(prize1) || 0, second: Number(prize2) || 0 }),
    });
    if (res.ok) {
      showToast("Prizes saved ✓");
      setMsg("prize", "Saved!");
    } else setMsg("prize", "Save failed.", true);
  }

  async function saveResults() {
    if (res1 && res2 && res1 === res2) {
      setMsg("results", "1st and 2nd can't be the same team.", true);
      return;
    }
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first: res1 || null, second: res2 || null }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast("Results saved ✓");
      setMsg("results", "Saved!");
    } else setMsg("results", d.error || "Save failed.", true);
  }

  function toggleKo(team: string) {
    setKoChecked((s) => {
      const n = new Set(s);
      if (n.has(team)) n.delete(team);
      else n.add(team);
      return n;
    });
  }
  function markAllIn() {
    setKoChecked(new Set());
  }
  async function saveEliminated() {
    const eliminated = [...koChecked];
    const res = await fetch("/api/eliminated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eliminated }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast("Knockouts saved ✓");
      setMsg("elim", `${eliminated.length} team(s) marked out.`);
    } else setMsg("elim", d.error || "Save failed.", true);
  }

  async function syncNow() {
    setSyncing(true);
    setMsg("sync", "Syncing from football-data.org…");
    const res = await fetch("/api/sync", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setSyncing(false);
    if (res.ok) {
      showToast("Synced ✓");
      setMsg("sync", `Updated ${d.updated} fixtures · ${d.eliminated} team(s) out.`);
      await load();
    } else setMsg("sync", d.error || "Sync failed (is FOOTBALL_DATA_TOKEN set?).", true);
  }

  const Msg = ({ k }: { k: string }) => {
    const m = msgs[k];
    if (!m?.msg) return <p className="msg" />;
    return <p className={`msg ${m.err ? "err" : "ok"}`}>{m.msg}</p>;
  };

  return (
    <>
      <header>
        <h1>⚙️ Settings</h1>
        <a className="btn" href="/">← Dashboard</a>
      </header>
      <main className="settings-main">
        {!admin ? (
          <div className="card">
            <h2>🔒 Admin Login</h2>
            <div className="row" style={{ maxWidth: 340 }}>
              <input
                type="password"
                placeholder="Settings password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
              <button className="btn-primary" onClick={login}>
                Unlock
              </button>
            </div>
            {loginErr && <p className="msg err">{loginErr}</p>}
          </div>
        ) : (
          <>
            {/* Site title */}
            <div className="card">
              <h2>🏷️ Site Title</h2>
              <p className="hint">Shown in the dashboard header and the browser tab.</p>
              <div className="row" style={{ maxWidth: 480 }}>
                <input
                  type="text"
                  placeholder="World Cup 2026 — Family Sweepstake"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button className="btn-primary" onClick={saveTitle}>
                  Save
                </button>
              </div>
              <Msg k="title" />
            </div>

            {/* Assignments */}
            <div className="card">
              <h2>👪 Family ↔ Team Assignments</h2>
              {rows.map((r) => {
                const used = usedByOthers(r.id);
                return (
                  <div className="row" key={r.id}>
                    <input
                      type="text"
                      placeholder="Name (e.g. Mum)"
                      value={r.name}
                      onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    />
                    <select value={r.team} onChange={(e) => updateRow(r.id, { team: e.target.value })}>
                      <option value="">— Pick team —</option>
                      {teams
                        .filter((t) => !used.has(t) || t === r.team)
                        .map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                    <button className="btn-danger" onClick={() => removeRow(r.id)}>
                      ✕
                    </button>
                  </div>
                );
              })}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-add" onClick={addRow}>
                  + Add Person
                </button>
                <button className="btn-primary" onClick={saveAssignments}>
                  Save Assignments
                </button>
                <button className="btn-add" onClick={exportAssignments} title="Download assignments as JSON">
                  ⬇ Export
                </button>
                <button className="btn-add" onClick={() => importRef.current?.click()} title="Load assignments from a JSON file">
                  ⬆ Import
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={importAssignments}
                  style={{ display: "none" }}
                />
              </div>
              <p className="hint" style={{ margin: "8px 0 0" }}>
                Export saves a backup of the family ↔ team list; Import loads one back in for review before saving.
              </p>
              <Msg k="assign" />
            </div>

            {/* Prizes */}
            <div className="card">
              <h2>💰 Prize Pot</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 400 }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label className="field-label">🥇 1st Place (£)</label>
                  <input type="number" min="0" value={prize1} onChange={(e) => setPrize1(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label className="field-label">🥈 2nd Place (£)</label>
                  <input type="number" min="0" value={prize2} onChange={(e) => setPrize2(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" onClick={savePrizes}>
                  Save Prizes
                </button>
              </div>
              <Msg k="prize" />
            </div>

            {/* Live sync */}
            <div className="card">
              <h2>🔄 Live Data Sync</h2>
              <p className="hint">
                Pull the latest fixtures, scores and advancing teams from football-data.org. Runs automatically on a
                schedule too — this button forces it now.
              </p>
              <button className="btn-primary" onClick={syncNow} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <Msg k="sync" />
            </div>

            {/* Results */}
            <div className="card">
              <h2>🏆 Final Results (manual override)</h2>
              <p className="hint">Usually set automatically once the Final is played. Set here only to override.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 520 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="field-label">🥇 Winner</label>
                  <select value={res1} onChange={(e) => setRes1(e.target.value)}>
                    <option value="">— Not set —</option>
                    {teams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="field-label">🥈 Runner-up</label>
                  <select value={res2} onChange={(e) => setRes2(e.target.value)}>
                    <option value="">— Not set —</option>
                    {teams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" onClick={saveResults}>
                  Save Results
                </button>
              </div>
              <Msg k="results" />
            </div>

            {/* Knockouts */}
            <div className="card">
              <h2>❌ Knockouts — Who&apos;s Still In (manual override)</h2>
              <p className="hint">
                Auto-updated by the live sync. Tick a team to force it out; anyone whose teams are all out drops off the
                prize race.
              </p>
              <div style={{ textAlign: "right", marginBottom: 6 }}>
                <button className="btn-add" onClick={markAllIn}>
                  Reset all to &quot;in&quot;
                </button>
              </div>
              {Object.entries(groups).map(([g, gteams]) => (
                <div className="ko-group" key={g}>
                  <div className="ko-gtitle">Group {g}</div>
                  {gteams.map((t) => {
                    const checked = koChecked.has(t);
                    return (
                      <label className={`ko-team${checked ? " checked" : ""}`} key={t}>
                        <input type="checkbox" checked={checked} onChange={() => toggleKo(t)} />
                        <FlagImg team={t} />
                        <span className="tname">{t}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" onClick={saveEliminated}>
                  Save Knockouts
                </button>
              </div>
              <Msg k="elim" />
            </div>

            {/* Traffic */}
            <div className="card">
              <h2>📊 Traffic</h2>
              {!stats ? (
                <p className="hint">Loading…</p>
              ) : (
                <>
                  <div className="traffic-summary">
                    <div>
                      <span className="big">{stats.today.unique}</span> unique today
                      <span className="muted"> · {stats.today.total} views</span>
                    </div>
                    <div className="hint">
                      All-time: {stats.allTime.unique} unique visitor{stats.allTime.unique === 1 ? "" : "s"} ·{" "}
                      {stats.allTime.total} views
                    </div>
                  </div>
                  {stats.days.length === 0 ? (
                    <p className="hint">No visits recorded yet.</p>
                  ) : (
                    <table className="traffic-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Unique</th>
                          <th>Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.days.map((d) => (
                          <tr key={d.day}>
                            <td>{fmtDate(d.day)}</td>
                            <td>{d.unique}</td>
                            <td>{d.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button className="btn-logout" onClick={logout}>
                Log out
              </button>
            </div>
          </>
        )}
      </main>
      {toast && <div className={`toast${toast.err ? " err" : ""}`}>{toast.msg}</div>}
    </>
  );
}

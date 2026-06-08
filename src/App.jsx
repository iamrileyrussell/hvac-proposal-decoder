import { useState, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are an HVAC proposal analysis assistant for Riley Russell, a professional HVAC Comfort Advisor in Raleigh, NC.

Analyze the HVAC proposal and respond with these exact sections:

## What You're Being Quoted
Plain-English summary of equipment and work proposed.

## Equipment Breakdown
Key equipment details. Rate each: ✅ Solid Choice, ⚠️ Worth Asking About, or ❌ Red Flag.

## What's Included (and What's Not)
What the proposal covers. Flag missing items like load calculation, static pressure test, ductwork inspection, labor warranty, permit, debris removal.

## Price Assessment
Honest context on price for the Raleigh, NC market. Acknowledge price alone doesn't tell the whole story.

## Questions to Ask Before Signing
3-5 specific questions to ask the contractor.

## Riley's Take
Brief warm summary — what stands out and whether to move forward or ask for more clarity.

Tone: friendly, educational, empowering. Simple language. Never fear-mongering.`;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.80).split(",")[1]);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function UploadZone({ file, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);
  return (
    <div onClick={() => ref.current.click()} onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      style={{ border: `2px dashed ${drag ? "#C8873A" : file ? "#2E7D4F" : "#CBD5E1"}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: drag ? "#FFF8F0" : file ? "#F0FAF4" : "#F8FAFC", transition: "all .2s" }}>
      <input ref={ref} type="file" accept=".pdf,image/*" style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (<><div style={{ fontSize: 28, marginBottom: 6 }}>✅</div><div style={{ color: "#2E7D4F", fontWeight: 700, fontSize: 14 }}>{file.name}</div><div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>Tap to change</div></>) : (<><div style={{ fontSize: 34, marginBottom: 10 }}>📄</div><div style={{ color: "#1E293B", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Upload your HVAC proposal</div><div style={{ color: "#64748B", fontSize: 13 }}>PDF or photo · tap to browse</div></>)}
    </div>
  );
}

function Field({ label, children }) {
  return (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{label}</div>{children}</div>);
}

const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 15, fontFamily: "inherit", color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box" };

function Results({ text }) {
  const sections = text.split(/(?=^## )/m).filter(s => s.trim());
  const icons = { "What You're Being Quoted": "📋", "Equipment Breakdown": "⚙️", "What's Included (and What's Not)": "✅", "Price Assessment": "💰", "Questions to Ask Before Signing": "❓", "Riley's Take": "🎯" };
  return (
    <div>
      {sections.map((sec, i) => {
        const lines = sec.trim().split("\n");
        const heading = lines[0].replace(/^##\s*/, "").trim();
        const body = lines.slice(1).join("\n").trim();
        const isRiley = heading === "Riley's Take";
        return (<div key={i} style={{ background: isRiley ? "#FFF8F0" : "#fff", border: `1.5px solid ${isRiley ? "#C8873A" : "#E2E8F0"}`, borderRadius: 14, padding: 18, marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: isRiley ? "#C8873A" : "#64748B", marginBottom: 8 }}>{icons[heading] || "📌"} {heading}</div><div style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{body}</div></div>);
      })}
      <div style={{ background: "linear-gradient(135deg,#1E293B,#2D3F55)", borderRadius: 16, padding: 24, textAlign: "center", marginTop: 6 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
        <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Want to talk it through with Riley?</div>
        <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>Free 15-minute call. No pressure. No sales pitch. Just straight answers.</div>
        <a href="mailto:rileyrussell40@gmail.com?subject=Proposal Review Request" style={{ display: "inline-block", background: "#C8873A", color: "#fff", padding: "13px 28px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Schedule a Free Call →</a>
      </div>
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", address: "", timeline: "" });
  const [step, setStep] = useState("form");
  const [result, setResult] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ready = file && form.name.trim() && form.email.trim();

  const run = async () => {
    setStep("loading"); setErrorMsg("");
    try {
      const isImg = file.type.startsWith("image/");
      let b64, mime;
      if (isImg) { b64 = await resizeImage(file); mime = "image/jpeg"; }
      else { b64 = await readFileAsBase64(file); mime = "application/pdf"; }
      const msgContent = [
        isImg ? { type: "image", source: { type: "base64", media_type: mime, data: b64 } } : { type: "document", source: { type: "base64", media_type: mime, data: b64 } },
        { type: "text", text: `Please analyze this HVAC proposal for ${form.name}${form.address ? " at " + form.address : ""}. Their decision timeline: ${form.timeline || "not specified"}.` }
      ];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: msgContent }] }),
      });
      const raw = await res.text();
      let json;
      try { json = JSON.parse(raw); } catch (e) { throw new Error("Bad response: " + raw.slice(0, 200)); }
      if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const txt = (json.content || []).map(b => b.text || "").join("\n").trim();
      if (!txt) throw new Error("Empty response from API");
      setResult(txt); setStep("result");
    } catch (e) { setErrorMsg(e.message); setStep("error"); }
  };

  const reset = () => { setFile(null); setForm({ name: "", email: "", address: "", timeline: "" }); setResult(""); setErrorMsg(""); setStep("form"); };

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "linear-gradient(160deg,#F8F4EF,#EEF2F7)" }}>
      <div style={{ background: "#1E293B", padding: "15px 20px", display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#C8873A", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 15 }}>RR</div>
        <div><div style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 15 }}>HVAC Proposal Decoder</div><div style={{ color: "#C8873A", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>by Riley Russell · Raleigh, NC</div></div>
      </div>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "22px 16px 60px" }}>
        {step === "form" && (<>
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.06)", display: "flex", gap: 13 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#1E293B,#2D3F55)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#C8873A", fontSize: 16, flexShrink: 0 }}>RR</div>
            <div><div style={{ fontWeight: 700, color: "#1E293B", fontSize: 15, marginBottom: 4 }}>Hey, I'm Riley Russell 👋</div><div style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6 }}>I've spent years helping Raleigh homeowners understand their HVAC options. Upload your proposal and I'll break it down in plain English — free, no strings attached.</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {["100% Free", "Plain English", "No Sales Pitch", "Raleigh Expert"].map(b => (<div key={b} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700, color: "#374151" }}>✓ {b}</div>))}
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, marginBottom: 13, boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 13, marginBottom: 12 }}>STEP 1 — Upload Your Proposal</div>
            <UploadZone file={file} onFile={setFile} />
          </div>
          <div style={{ background: "#fff", borderRadius: 18, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 13, marginBottom: 14 }}>STEP 2 — A Little About You</div>
            <Field label="Your Name *"><input style={inputStyle} value={form.name} placeholder="Jane Smith" onChange={e => set("name", e.target.value)} /></Field>
            <Field label="Email Address *"><input style={inputStyle} type="email" value={form.email} placeholder="jane@example.com" onChange={e => set("email", e.target.value)} /></Field>
            <Field label="Your Address (optional)"><input style={inputStyle} value={form.address} placeholder="123 Main St, Raleigh NC" onChange={e => set("address", e.target.value)} /></Field>
            <Field label="When are you looking to decide?">
              <select style={inputStyle} value={form.timeline} onChange={e => set("timeline", e.target.value)}>
                <option value="">Select a timeline</option>
                <option>ASAP – system is down</option>
                <option>Within 1–2 weeks</option>
                <option>Within a month</option>
                <option>Just researching for now</option>
              </select>
            </Field>
          </div>
          <button onClick={run} disabled={!ready} style={{ width: "100%", padding: 17, borderRadius: 13, border: "none", background: ready ? "#C8873A" : "#E2E8F0", color: ready ? "#fff" : "#94A3B8", fontFamily: "inherit", fontSize: 16, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed" }}>Decode My Proposal →</button>
          <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 10 }}>Your info is never sold or shared with other contractors.</div>
        </>)}
        {step === "loading" && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>Analyzing your proposal…</div>
            <div style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6 }}>Riley's AI is reviewing your proposal.<br />This usually takes 20–40 seconds.</div>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 8 }}>
              {[0, 1, 2].map(i => (<div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#C8873A", animation: `dot 1.2s ${i * 0.2}s infinite` }} />))}
            </div>
            <style>{`@keyframes dot { 0%,80%,100%{transform:scale(.5);opacity:.3} 40%{transform:scale(1);opacity:1} }`}</style>
          </div>
        )}
        {step === "result" && (<>
          <div style={{ background: "#2E7D4F", borderRadius: 13, padding: "14px 18px", marginBottom: 18, color: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>✅ Analysis ready, {form.name.split(" ")[0]}!</div>
            <div style={{ fontSize: 12, opacity: .85 }}>Riley will follow up at {form.email}</div>
          </div>
          <Results text={result} />
          <button onClick={reset} style={{ width: "100%", marginTop: 16, padding: 13, borderRadius: 12, border: "1.5px solid #CBD5E1", background: "transparent", color: "#64748B", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>Analyze Another Proposal</button>
        </>)}
        {step === "error" && (
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 18, marginBottom: 12 }}>Something went wrong</div>
            <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: 16, color: "#DC2626", fontSize: 13, lineHeight: 1.6, textAlign: "left", marginBottom: 20, wordBreak: "break-word" }}>{errorMsg}</div>
            <button onClick={reset} style={{ padding: "13px 28px", borderRadius: 12, border: "none", background: "#C8873A", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

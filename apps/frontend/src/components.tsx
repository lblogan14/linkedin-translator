import { useEffect, useState } from "react";
import {
  TACTIC_INFO,
  type DecodeResult,
  type GenerateResult,
} from "@linkedin-translator/shared";

/* ---------- copy button ---------- */

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`mini-btn${copied ? " copied" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/* ---------- loading animation ---------- */

const LOADING_MESSAGES: Record<"decode" | "generate", string[]> = {
  decode: [
    "Reading between the lines…",
    "Detecting humblebrags…",
    "Measuring cringe density…",
    "Cross-referencing the buzzword lexicon…",
    "Stripping the broetry formatting…",
    "Translating into plain human…",
  ],
  generate: [
    "Warming up the thought-leadership…",
    "Inserting dramatic line breaks…",
    "Calibrating the cringe dial…",
    "Manufacturing vulnerability…",
    "Sprinkling strategic emojis…",
    "Engineering the engagement bait…",
  ],
};

export function LoadingPanel({ kind }: { kind: "decode" | "generate" }) {
  const messages = LOADING_MESSAGES[kind];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((prev) => (prev + 1) % messages.length),
      1300,
    );
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-bar" aria-hidden="true" />
      <p className="loader-status">
        <span className="arrow">{">"}</span>
        <span className="msg" key={i}>
          {messages[i]}
        </span>
        <span className="cursor" aria-hidden="true" />
      </p>
      <div className="loader-lines" aria-hidden="true">
        <div className="loader-line" />
        <div className="loader-line" />
        <div className="loader-line" />
        <div className="loader-line" />
      </div>
    </div>
  );
}

/* ---------- cringe meter ---------- */

export function CringeMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span className="meter-score">{score}/100</span>
        <span className="meter-label">{label}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/* ---------- decode result ---------- */

export function DecodeOutput({ result }: { result: DecodeResult }) {
  return (
    <div>
      <CringeMeter score={result.cringeScore} label={result.cringeLabel} />
      <div className="tldr">“{result.tldr}”</div>

      <label className="field-label">Plain English</label>
      <p className="plain-output">{result.plainMeaning}</p>

      {result.tactics.length > 0 && (
        <>
          <label className="field-label" style={{ marginTop: 18 }}>
            Tactics detected ({result.tactics.length})
          </label>
          <div className="tactics">
            {result.tactics.map((t, i) => {
              const info = TACTIC_INFO[t.type];
              return (
                <div className="tactic" key={`${t.type}-${i}`}>
                  <div className="tactic-head">
                    <span className="tactic-emoji">{info.emoji}</span>
                    <span className="tactic-name">{info.label}</span>
                    <span className="tactic-sev">{Math.round(t.severity)}%</span>
                  </div>
                  <div className="tactic-body">
                    {t.evidence && (
                      <span className="tactic-evidence">“{t.evidence}”</span>
                    )}
                    <div className="tactic-explain">{t.explanation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- generate result ---------- */

export function GenerateOutput({ result }: { result: GenerateResult }) {
  return (
    <div>
      <p className="post-output">{result.post}</p>

      {(result.tacticsApplied.length > 0 ||
        result.hashtags.length > 0 ||
        result.sources.length > 0) && (
        <div className="meta-strip">
          {result.tacticsApplied.length > 0 && (
            <>
              <label className="field-label">Tricks applied</label>
              <div className="tag-list" style={{ marginBottom: 10 }}>
                {result.tacticsApplied.map((t) => (
                  <span className="tag" key={t}>
                    {TACTIC_INFO[t]?.label ?? t}
                  </span>
                ))}
              </div>
            </>
          )}
          {result.sources.length > 0 && (
            <>
              <label className="field-label">Grounded in</label>
              <ul style={{ margin: "0 0 4px", paddingLeft: 18 }}>
                {result.sources.map((s, i) => (
                  <li key={i}>
                    <a
                      className="source-link"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

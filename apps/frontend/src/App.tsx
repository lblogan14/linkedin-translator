import { useMemo, useState } from "react";
import {
  STYLES,
  STYLE_INFO,
  type DecodeResult,
  type GenerateResult,
  type Style,
} from "@linkedin-translator/shared";
import { decode, generate } from "./api.js";
import { useHistory, type HistoryEntry } from "./history.js";
import {
  CopyButton,
  DecodeOutput,
  GenerateOutput,
  LoadingPanel,
} from "./components.js";

type Mode = "decode" | "generate";

const INTENSITY_CAPTION: Record<number, string> = {
  1: "Barely seasoned — almost human.",
  2: "A light dusting of LinkedIn.",
  3: "Classic feed energy.",
  4: "Heavy broetry. Line. By. Line.",
  5: "Maximum cringe. No survivors.",
};

const DECODE_SAMPLE = `I wasn't going to share this, but here goes. 👇

3 years ago I was sleeping in my car.

Today I closed a 7-figure round.

The difference?

I never stopped believing.

If you're reading this and you're struggling — DON'T QUIT.

Agree? 🙌

#startup #grind #blessed #leadership`;

export function App() {
  const [mode, setMode] = useState<Mode>("decode");
  const history = useHistory();

  return (
    <div className="shell">
      <header className="masthead">
        <div className="kicker">
          <span>The LinkedIn Translator</span>
          <span>Powered by binliu14 · est. 2026</span>
        </div>
        <h1>
          Decode the <span className="mark">cringe.</span>
        </h1>
        <p className="dek">
          Paste a LinkedIn post to find out what it <em>actually</em> means — or
          take a plain sentence and inflate it into peak thought-leadership.
        </p>
      </header>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "decode"}
          className="tab"
          onClick={() => setMode("decode")}
        >
          ① Decode a post
          <span className="tab-sub">post → plain English + cringe report</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === "generate"}
          className="tab"
          onClick={() => setMode("generate")}
        >
          ② Inflate a sentence
          <span className="tab-sub">plain sentence → LinkedIn post</span>
        </button>
      </div>

      {mode === "decode" ? (
        <DecodeMode onSave={history.add} />
      ) : (
        <GenerateMode onSave={history.add} />
      )}

      <HistorySection
        history={history}
        onRestore={(e) => setMode(e.kind)}
      />

      <p className="foot">
        Built with TypeScript · Fastify · LangGraph · React — no engagement bait,
        we promise.
      </p>
    </div>
  );
}

/* ========================================================================== */
/*  Decode mode                                                               */
/* ========================================================================== */

function DecodeMode({
  onSave,
}: {
  onSave: (e: Omit<HistoryEntry, "id" | "at">) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await decode(text);
      setResult(r);
      onSave({ kind: "decode", input: text, summary: r.tldr, payload: r });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <span>The post</span>
          <button className="mini-btn" onClick={() => setText(DECODE_SAMPLE)}>
            Try a sample
          </button>
        </div>
        <div className="panel-body">
          <textarea
            className="input"
            placeholder="Paste that humbled-and-honored post here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="controls">
            <button className="go" onClick={run} disabled={loading || !text.trim()}>
              {loading ? "Decoding…" : "Decode it →"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span>The translation</span>
          {result && <CopyButton text={result.plainMeaning} label="Copy plain" />}
        </div>
        <div className="panel-body">
          {error && <div className="err">{error}</div>}
          {loading && <LoadingPanel kind="decode" />}
          {!loading && !error && !result && (
            <p className="placeholder">
              {">"} Your honest, deflated translation will appear here.
              <br />
              {">"} Plus a cringe score and the exact tactics being used on you.
            </p>
          )}
          {result && <DecodeOutput result={result} />}
        </div>
      </section>
    </div>
  );
}

/* ========================================================================== */
/*  Generate mode                                                             */
/* ========================================================================== */

function GenerateMode({
  onSave,
}: {
  onSave: (e: Omit<HistoryEntry, "id" | "at">) => void;
}) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<Style>("broetry");
  const [intensity, setIntensity] = useState(3);
  const [addHashtags, setAddHashtags] = useState(true);
  const [addEmojis, setAddEmojis] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await generate({
        text,
        style,
        intensity,
        addHashtags,
        addEmojis,
        useWebSearch,
      });
      setResult(r);
      onSave({
        kind: "generate",
        input: text,
        summary: r.post.split("\n")[0]?.slice(0, 80) ?? text,
        payload: r,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <span>Plain sentence</span>
        </div>
        <div className="panel-body">
          <textarea
            className="input"
            style={{ minHeight: 120 }}
            placeholder="e.g. I got a new job at a small startup."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="controls">
            <div>
              <label className="field-label">Style</label>
              <div className="row">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    className="chip"
                    aria-pressed={style === s}
                    onClick={() => setStyle(s)}
                    title={STYLE_INFO[s].blurb}
                  >
                    {STYLE_INFO[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Cringe intensity</label>
              <div className="dial">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-pressed={intensity === n}
                    onClick={() => setIntensity(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="dial-caption">{INTENSITY_CAPTION[intensity]}</div>
            </div>

            <div className="toggle-row">
              <button
                className="chip"
                aria-pressed={addEmojis}
                onClick={() => setAddEmojis((v) => !v)}
              >
                {addEmojis ? "😀 Emojis: on" : "Emojis: off"}
              </button>
              <button
                className="chip"
                aria-pressed={addHashtags}
                onClick={() => setAddHashtags((v) => !v)}
              >
                {addHashtags ? "# Hashtags: on" : "Hashtags: off"}
              </button>
              <button
                className="chip"
                aria-pressed={useWebSearch}
                onClick={() => setUseWebSearch((v) => !v)}
                title="Ground the post in a real, current fact via web search (when the provider supports it)"
              >
                {useWebSearch ? "🔎 Web facts: on" : "Web facts: off"}
              </button>
            </div>

            <button className="go" onClick={run} disabled={loading || !text.trim()}>
              {loading ? "Inflating…" : "Make it LinkedIn →"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span>Your post</span>
          {result && (
            <div className="out-toolbar">
              <CopyButton text={result.post} label="Copy post" />
            </div>
          )}
        </div>
        <div className="panel-body">
          {error && <div className="err">{error}</div>}
          {loading && <LoadingPanel kind="generate" />}
          {!loading && !error && !result && (
            <p className="placeholder">
              {">"} Pick a style and an intensity.
              <br />
              {">"} Your algorithm-optimized masterpiece lands here.
            </p>
          )}
          {result && <GenerateOutput result={result} />}
        </div>
      </section>
    </div>
  );
}

/* ========================================================================== */
/*  History                                                                   */
/* ========================================================================== */

function HistorySection({
  history,
  onRestore,
}: {
  history: ReturnType<typeof useHistory>;
  onRestore: (e: HistoryEntry) => void;
}) {
  const { entries, remove, clear } = history;
  const hasAny = entries.length > 0;

  const items = useMemo(() => entries.slice(0, 30), [entries]);

  return (
    <section className="history">
      <div className="panel-head">
        <span>History · {entries.length}</span>
        {hasAny && (
          <button className="mini-btn" onClick={clear}>
            Clear all
          </button>
        )}
      </div>
      {!hasAny ? (
        <div className="empty-note">
          {">"} Nothing yet. Decoded posts and generated cringe will be saved here
          (locally, in your browser).
        </div>
      ) : (
        <ul className="history-list">
          {items.map((e) => (
            <li className="history-item" key={e.id}>
              <span className={`history-kind ${e.kind}`}>
                {e.kind === "decode" ? "Decode" : "Inflate"}
              </span>
              <span
                className="history-summary"
                title={e.input}
                onClick={() => onRestore(e)}
              >
                {e.summary || e.input}
              </span>
              <button
                className="history-x"
                aria-label="Delete"
                onClick={() => remove(e.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

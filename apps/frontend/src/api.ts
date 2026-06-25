import type {
  DecodeResult,
  GenerateRequest,
  GenerateResult,
} from "@linkedin-translator/shared";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string }).error ?? `Request failed (${res.status})`;
    const details = (data as { details?: unknown }).details;
    throw new Error(
      typeof details === "string" ? `${msg}: ${details}` : msg,
    );
  }
  return data as T;
}

export function decode(text: string): Promise<DecodeResult> {
  return post<DecodeResult>("/api/decode", { text });
}

export function generate(req: GenerateRequest): Promise<GenerateResult> {
  return post<GenerateResult>("/api/generate", req);
}

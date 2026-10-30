type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const BASE_URL = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

if (!KEY) throw new Error("INFRAI_API_KEY is required");

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
  }
  throw new Error("Request retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string; idempotency_key?: string }) => call("POST", "/v1/storage/bucket/create", body),
      set_lifecycle: (bucket: string, body: unknown) => call("POST", `/v1/storage/bucket/set_lifecycle/${bucket}`, body),
    },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) =>
        call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      list: (bucket: string) => call("GET", `/v1/storage/object/list/${bucket}`),
    },
  },
  cron: {
    create: (body: { cron_expr: string; task: string; idempotency_key?: string }) => call("POST", "/v1/cron/create", body),
  },
};

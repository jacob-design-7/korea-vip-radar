type QueryOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

export class SupabaseRestClient {
  private readonly baseUrl: string;
  private readonly key: string;

  constructor() {
    const baseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !key) {
      throw new Error("Supabase server environment is not configured.");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.key = key;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.key,
      "Content-Type": "application/json",
      Accept: "application/json"
    };

    // Legacy service_role keys are JWTs and need Authorization explicitly.
    // New sb_secret_* keys are opaque API keys; Supabase gateway handles them
    // through the apikey header and synthesizes downstream authorization.
    if (!this.key.startsWith("sb_secret_")) {
      headers.Authorization = `Bearer ${this.key}`;
    }

    return headers;
  }

  async request<T>(path: string, options: QueryOptions = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}/rest/v1/${path}`, {
      method: options.method || "GET",
      headers: {...this.authHeaders(), ...(options.headers || {})},
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 500)}`);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

const USER_AGENT = "Mozilla/5.0 (compatible; SpesaChiaraBot/0.1; progetto personale di confronto prezzi)";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
}

export async function fetchText(url: string, { retries = 2, timeoutMs = 30000 }: FetchOptions = {}): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "it-IT,it;q=0.9", Accept: "text/html,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status} su ${url}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} su ${url}`);
      const text = await response.text();
      // Cede un attimo il thread: il telefono ridisegna l'interfaccia tra una pagina e l'altra invece di restare bloccato.
      await sleep(8);
      return text;
    } catch (error) {
      lastError = error;
      const message = (error as Error).message;
      if (/HTTP 4\d\d/.test(message) && !message.includes("429")) break;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchBinary(url: string, timeoutMs = 120000): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status} su ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

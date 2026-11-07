// Hermes non ha AbortSignal.timeout, usato dagli scraper condivisi.
const signal = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal };
if (typeof signal.timeout !== "function") {
  signal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

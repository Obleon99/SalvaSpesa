// Lettura semplificata del formato opening_hours di OpenStreetMap (es. "Mo-Sa 08:00-20:00; Su 09:00-13:00").
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
export const DAY_NAMES = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export type Slot = [number, number]; // minuti dalla mezzanotte
export type WeekHours = Slot[][]; // 7 giorni, lunedì = 0

const toMinutes = (text: string): number => {
  const [h, m] = text.split(":").map(Number);
  return h * 60 + m;
};

function expandDays(spec: string): number[] | null {
  const days = new Set<number>();
  for (const part of spec.split(",")) {
    const [from, to] = part.trim().split("-");
    const a = DAYS.indexOf(from as (typeof DAYS)[number]);
    const b = to === undefined ? a : DAYS.indexOf(to as (typeof DAYS)[number]);
    if (a < 0 || b < 0) return null;
    for (let i = a; ; i = (i + 1) % 7) {
      days.add(i);
      if (i === b) break;
    }
  }
  return [...days];
}

// Restituisce null se il testo usa regole che non so interpretare (feste, settimane, mesi…): in quel caso si mostra il testo originale.
export function parseOpeningHours(raw: string): WeekHours | null {
  const text = raw.trim();
  const week: WeekHours = [[], [], [], [], [], [], []];
  if (/^24\/7$/.test(text)) return week.map(() => [[0, 1440]] as Slot[]);

  for (const rule of text.split(";")) {
    const clean = rule.trim();
    if (!clean) continue;
    const match = /^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)(?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?\s*(off|closed|\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*)$/i.exec(clean);
    if (!match) return null;
    const days = match[1] ? expandDays(match[1]) : [0, 1, 2, 3, 4, 5, 6];
    if (!days) return null;
    const spec = match[2].toLowerCase();
    for (const day of days) {
      if (spec === "off" || spec === "closed") {
        week[day] = [];
        continue;
      }
      week[day] = spec.split(",").map((range) => {
        const [start, end] = range.trim().split("-");
        const s = toMinutes(start);
        const e = toMinutes(end);
        return [s, e <= s ? e + 1440 : e] as Slot;
      });
    }
  }
  return week;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const formatMinutes = (minutes: number) => `${pad(Math.floor((minutes % 1440) / 60))}:${pad(minutes % 60)}`;

export function formatSlots(slots: Slot[]): string {
  return slots.length === 0 ? "Chiuso" : slots.map(([a, b]) => `${formatMinutes(a)}–${formatMinutes(b)}`).join(", ");
}

export function openStatus(week: WeekHours, now = new Date()): { open: boolean; text: string } {
  const day = (now.getDay() + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const prev = week[(day + 6) % 7];
  // Orari che passano la mezzanotte: il turno di ieri può essere ancora in corso.
  const carried = prev.find(([, end]) => end > 1440 && minutes < end - 1440);
  if (carried) return { open: true, text: `Aperto fino alle ${formatMinutes(carried[1])}` };
  const current = week[day].find(([start, end]) => minutes >= start && minutes < end);
  if (current) return { open: true, text: `Aperto fino alle ${formatMinutes(current[1])}` };
  const later = week[day].find(([start]) => start > minutes);
  if (later) return { open: false, text: `Chiuso, apre alle ${formatMinutes(later[0])}` };
  for (let i = 1; i <= 7; i++) {
    const next = week[(day + i) % 7][0];
    if (next) return { open: false, text: `Chiuso, riapre ${i === 1 ? "domani" : DAY_NAMES[(day + i) % 7].toLowerCase()} alle ${formatMinutes(next[0])}` };
  }
  return { open: false, text: "Chiuso" };
}

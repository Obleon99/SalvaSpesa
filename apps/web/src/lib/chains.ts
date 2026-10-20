interface ChainRule {
  id: string;
  name: string;
  pattern: RegExp;
}

const chainRules: ChainRule[] = [
  { id: "esselunga", name: "Esselunga", pattern: /esselunga/i },
  { id: "conad", name: "Conad", pattern: /conad/i },
  { id: "coop", name: "Coop", pattern: /\b(coop|ipercoop|unicoop|nova coop)\b/i },
  { id: "lidl", name: "Lidl", pattern: /lidl/i },
  { id: "eurospin", name: "Eurospin", pattern: /eurospin/i },
  { id: "carrefour", name: "Carrefour", pattern: /carrefour/i },
  { id: "pam", name: "Pam", pattern: /\b(pam|panorama)\b/i },
  { id: "penny", name: "Penny", pattern: /penny/i },
  { id: "aldi", name: "Aldi", pattern: /\baldi\b/i },
  { id: "md", name: "MD", pattern: /^md\b|\bmd discount\b/i },
  { id: "despar", name: "Despar", pattern: /despar|eurospar|interspar/i },
  { id: "famila", name: "Famila", pattern: /famila|superstore/i },
  { id: "bennet", name: "Bennet", pattern: /bennet/i },
  { id: "tigros", name: "Tigros", pattern: /tigros/i },
  { id: "iper", name: "Iper", pattern: /\biper\b|la grande i/i },
  { id: "todis", name: "Todis", pattern: /todis/i },
  { id: "ins", name: "In's", pattern: /\bin'?s\b/i },
  { id: "crai", name: "Crai", pattern: /\bcrai\b/i },
  { id: "dok", name: "Dok", pattern: /\bdok\b/i },
  { id: "sigma", name: "Sigma", pattern: /\bsigma\b/i },
  { id: "simply", name: "Simply", pattern: /simply/i },
  { id: "il-gigante", name: "Il Gigante", pattern: /il gigante/i },
  { id: "basko", name: "Basko", pattern: /basko/i },
  { id: "naturasi", name: "NaturaSì", pattern: /natura\s?s[iì]/i },
];

export function detectChain(...candidates: Array<string | undefined>): { id: string; name: string } {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const rule = chainRules.find((r) => r.pattern.test(candidate));
    if (rule) return { id: rule.id, name: rule.name };
  }
  return { id: "altro", name: "Altro" };
}

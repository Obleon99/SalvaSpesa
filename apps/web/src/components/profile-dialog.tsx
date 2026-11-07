"use client";

import { useState } from "react";
import { GROUPS } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { Modal } from "./modal";
import { useUserState } from "@/lib/user-state";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-surface-container-low px-space-sm py-2 rounded-xl">
      <span className="font-body-md text-body-md text-on-surface font-semibold">{label}</span>
      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          aria-label={`Diminuisci ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-sm text-primary disabled:opacity-40 flex items-center justify-center"
        >
          <Icon name="remove" className="text-lg" />
        </button>
        <span className="w-6 text-center font-title-md text-title-md text-on-surface tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Aumenta ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-sm text-primary disabled:opacity-40 flex items-center justify-center"
        >
          <Icon name="add" className="text-lg" />
        </button>
      </div>
    </div>
  );
}

export function ProfileDialog() {
  const { profile, setProfile, closeDialog } = useUserState();
  const [name, setName] = useState(profile.name);
  const [adults, setAdults] = useState(profile.adults);
  const [children, setChildren] = useState(profile.children);
  const [categories, setCategories] = useState<string[]>(profile.categories);
  const [budget, setBudget] = useState(profile.weeklyBudget === null ? "" : String(profile.weeklyBudget));

  const parsedBudget = budget.trim() === "" ? null : Number(budget.replace(",", "."));
  const budgetInvalid = parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0 || parsedBudget > 5000);

  function onSave() {
    if (budgetInvalid) return;
    setProfile({
      name: name.trim(),
      adults,
      children,
      categories,
      weeklyBudget: parsedBudget === null ? null : Math.round(parsedBudget * 100) / 100,
    });
    closeDialog();
  }

  return (
    <Modal title="Il tuo profilo" onClose={closeDialog}>
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="profile-name" className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          Nome
        </label>
        <input
          id="profile-name"
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          placeholder="Come ti chiami?"
          className="bg-surface-container-low px-space-sm py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-space-xs">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          Nucleo familiare · {adults + children} {adults + children === 1 ? "persona" : "persone"}
        </span>
        <Stepper label="Adulti" value={adults} min={1} max={8} onChange={setAdults} />
        <Stepper label="Bambini" value={children} min={0} max={8} onChange={setChildren} />
      </div>

      <div className="flex flex-col gap-space-xs">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Categorie che vuoi vedere</span>
        <div className="flex flex-wrap gap-space-xs" role="group" aria-label="Categorie">
          {GROUPS.filter((g) => g.id !== "altro").map((g) => {
            const on = categories.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategories((current) => (on ? current.filter((id) => id !== g.id) : [...current, g.id]))}
                className={`px-space-sm py-1.5 rounded-full font-body-sm text-body-sm flex items-center gap-1 transition-colors ${
                  on ? "bg-primary text-on-primary font-semibold shadow-sm" : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                }`}
              >
                <Icon name={g.icon} className="text-base" />
                {g.label}
              </button>
            );
          })}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {categories.length === 0 ? "Nessuna scelta: vedi tutte le categorie." : "Offerte, confronti e ricerca mostreranno solo queste categorie."}
        </p>
      </div>

      <div className="flex flex-col gap-space-xs">
        <label htmlFor="profile-budget" className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          Spesa settimanale prevista (facoltativo)
        </label>
        <div className="relative">
          <input
            id="profile-budget"
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder="es. 120"
            aria-invalid={budgetInvalid}
            className="w-full bg-surface-container-low pl-space-sm pr-10 py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline font-body-md">€</span>
        </div>
        {budgetInvalid ? (
          <p className="font-body-sm text-body-sm text-error">Inserisci un importo valido (da 0 a 5000 €).</p>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Serve a confrontare il carrello con quanto pensi di spendere.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-space-xs pt-space-xs">
        <button
          type="button"
          onClick={closeDialog}
          className="px-space-md py-2 rounded-xl text-on-surface hover:bg-surface-container-high font-body-sm text-body-sm font-semibold transition-colors"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={budgetInvalid}
          className="px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-body-sm text-body-sm font-semibold transition-colors shadow-sm"
        >
          Salva profilo
        </button>
      </div>
    </Modal>
  );
}

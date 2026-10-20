"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Icon } from "./icon";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-margin">
      <div className="absolute inset-0 bg-inverse-surface/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-xl p-space-md sm:p-space-lg flex flex-col gap-space-md"
      >
        <div className="flex items-start justify-between gap-space-sm">
          <h2 id={titleId} className="font-headline-md text-headline-md text-on-surface">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

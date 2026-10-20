import { Icon } from "./icon";
import type { CompareCategoryCard, CompareStripItem } from "@/lib/mock-data";

const stripClassByVariant: Record<CompareStripItem["variant"], string> = {
  leader: "bg-surface-container-low",
  winner: "bg-primary-fixed/25",
  discount: "bg-surface-container-low",
};

const nameClassByVariant: Record<CompareStripItem["variant"], string> = {
  leader: "font-title-md text-title-md text-on-surface font-bold",
  winner: "font-title-md text-title-md text-primary font-bold",
  discount: "font-title-md text-title-md text-on-surface font-semibold",
};

const metaClassByVariant: Record<CompareStripItem["variant"], string> = {
  leader: "font-label-unit text-label-unit text-on-surface-variant",
  winner: "font-label-unit text-label-unit text-primary font-medium",
  discount: "font-label-unit text-label-unit text-on-surface-variant",
};

const priceClassByVariant: Record<CompareStripItem["variant"], string> = {
  leader: "font-label-price-sm text-label-price-sm text-on-surface",
  winner: "font-label-price-sm text-label-price-sm text-primary font-bold",
  discount: "font-label-price-sm text-label-price-sm text-primary font-bold",
};

const secondaryLineClassByVariant: Record<CompareStripItem["variant"], string> = {
  leader: "font-label-unit text-label-unit text-on-surface-variant",
  winner: "font-label-unit text-label-unit text-primary",
  discount: "font-label-unit text-label-unit text-primary font-semibold",
};

function CompareStripRow({ item }: { item: CompareStripItem }) {
  return (
    <div className={`p-space-xs rounded-xl flex items-center justify-between ${stripClassByVariant[item.variant]}`}>
      <div className="flex items-center gap-space-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-10 h-14 object-contain rounded" src={item.imageUrl} alt={item.imageAlt} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className={nameClassByVariant[item.variant]}>{item.name}</span>
            {item.icon ? <Icon name={item.icon} className="text-primary text-base" /> : null}
          </div>
          <div className={metaClassByVariant[item.variant]}>{item.meta}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`${priceClassByVariant[item.variant]} tabular-nums`}>{item.price}</div>
        <div className={`${secondaryLineClassByVariant[item.variant]} tabular-nums`}>{item.secondaryLine}</div>
      </div>
    </div>
  );
}

export function CompareCategoryCardView({ card }: { card: CompareCategoryCard }) {
  const accentClass = card.accent === "primary" ? "text-primary" : "text-tertiary";

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-space-md md:p-space-lg shadow-sm flex flex-col justify-between">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className={`font-label-caps text-label-caps uppercase font-bold tracking-wider ${accentClass}`}>
            {card.categoryLabel}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-label-unit font-label-unit">
            {card.badge}
          </span>
        </div>
        <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">{card.title}</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{card.description}</p>
        <div className="mt-space-xs flex flex-col gap-space-xs">
          {card.items.map((item) => (
            <CompareStripRow key={item.name} item={item} />
          ))}
        </div>
      </div>
      <div className="mt-space-sm pt-space-xs flex items-center justify-between text-label-unit font-label-unit text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name={card.footerIcon} className={`text-sm ${card.footerIconColorClass}`} /> {card.footerNote}
        </span>
        <a className="text-primary font-bold hover:underline" href="#">
          {card.footerLinkLabel}
        </a>
      </div>
    </div>
  );
}

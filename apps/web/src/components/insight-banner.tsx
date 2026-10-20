import { Icon } from "./icon";
import { insightBanner as data } from "@/lib/mock-data";

export function InsightBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-space-md md:p-space-xl shadow-md">
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
        <div className="lg:col-span-8 flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-lowest text-primary font-label-caps text-label-caps uppercase tracking-wider w-fit shadow-sm">
            <Icon name="psychology_alt" className="text-sm text-primary" />
            <span>{data.eyebrow}</span>
          </div>
          <h2 className="font-headline-md text-headline-md md:font-headline-lg md:text-headline-lg text-on-surface leading-tight">
            {data.title}
            <span className="text-primary underline decoration-primary-fixed decoration-4 underline-offset-4">
              {data.titleHighlight}
            </span>
            {data.titleSuffix}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            {data.body}
            <strong className="text-on-surface font-bold">{data.bodyHighlight}</strong>
            {data.bodySuffix}
          </p>
          <div className="mt-space-xs flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-2 bg-surface-container-lowest px-space-sm py-2 rounded-xl shadow-sm">
              <Icon name="savings" className="text-primary text-xl" />
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  {data.savingsStat.label}
                </p>
                <p className="font-title-md text-title-md font-bold text-primary">{data.savingsStat.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest px-space-sm py-2 rounded-xl shadow-sm">
              <Icon name="verified_user" className="text-tertiary text-xl" />
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  {data.qualityStat.label}
                </p>
                <p className="font-title-md text-title-md font-bold text-on-surface">{data.qualityStat.value}</p>
              </div>
            </div>
            <button className="bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-md py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5">
              <span>{data.ctaLabel}</span>
              <Icon name="arrow_forward" className="text-sm" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold tracking-wider">
              {data.benchmarkTitle}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-label-unit font-bold">
              {data.benchmarkBadge}
            </span>
          </div>
          <div className="flex flex-col gap-space-xs my-1">
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span className="font-semibold text-on-surface">{data.leaderBrand}</span>
              <span className="font-bold text-on-surface tabular-nums">
                {data.leaderPrice} <span className="text-xs font-normal text-on-surface-variant">({data.leaderUnitPrice})</span>
              </span>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-outline rounded-full" style={{ width: "100%" }} />
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm mt-1">
              <span className="font-semibold text-primary">{data.mddBrand}</span>
              <span className="font-bold text-primary tabular-nums">
                {data.mddPrice} <span className="text-xs font-normal text-on-surface-variant">({data.mddUnitPrice})</span>
              </span>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "58%" }} />
            </div>
          </div>
          <div className="pt-2 bg-surface-container-low p-2.5 rounded-xl text-on-surface-variant text-label-unit font-label-unit flex items-start gap-2">
            <Icon name="info" className="text-primary text-base shrink-0 mt-0.5" />
            <span>{data.footnote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

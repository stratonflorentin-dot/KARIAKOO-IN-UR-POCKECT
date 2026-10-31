"use client";

import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/i18n/Link";
import type { CustomerPromotion } from "@/lib/data/promotions";

export function BannerAdSpot({ ads, title, adLabel, visitShop, previousAd, nextAd, positionLabel }: {
  ads: CustomerPromotion[];
  title: string;
  adLabel: string;
  visitShop: string;
  previousAd: string;
  nextAd: string;
  positionLabel: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const banners = ads.filter((ad) => ad.imageUrl && ad.kind === "banner");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateIndex = () => {
      const slides = Array.from(track.children);
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      slides.forEach((slide, index) => {
        const distance = Math.abs((slide as HTMLElement).offsetLeft - track.scrollLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      setActiveIndex(nearestIndex);
    };
    track.addEventListener("scroll", updateIndex, { passive: true });
    return () => track.removeEventListener("scroll", updateIndex);
  }, [banners.length]);

  if (banners.length === 0) return null;

  function goTo(index: number) {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h2>
        {banners.length > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goTo(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} aria-label={previousAd} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand-400 disabled:opacity-40">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(Math.min(banners.length - 1, activeIndex + 1))} disabled={activeIndex === banners.length - 1} aria-label={nextAd} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand-400 disabled:opacity-40">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <ul ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth rounded-3xl">
        {banners.map((ad, index) => {
          const href = ad.productSlug ? `/customer/product/${ad.productSlug}` : `/customer/shops/${ad.shopSlug}`;
          return (
            <li key={ad.id} className="w-full shrink-0 snap-start">
              <Link href={href} className="group relative block overflow-hidden rounded-3xl bg-night text-white">
                <div className="relative aspect-[16/8] sm:aspect-[16/6] lg:aspect-[16/5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.imageUrl!} alt={ad.title ?? ad.shopName} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-gold-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink sm:left-6 sm:top-6 sm:text-xs">{adLabel}</span>
                  <div className="absolute inset-y-0 left-0 flex max-w-[80%] flex-col items-start justify-end p-4 pb-5 sm:max-w-[62%] sm:p-8 lg:p-10">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-white/80 sm:text-sm"><Store size={14} aria-hidden="true" /> {ad.shopName}</p>
                    <h3 className="line-clamp-2 text-xl font-black leading-tight sm:text-3xl lg:text-4xl">{ad.title}</h3>
                    {ad.body && <p className="mt-2 line-clamp-2 max-w-xl text-xs text-white/80 sm:text-sm">{ad.body}</p>}
                    <span className="mt-3 inline-flex min-h-9 items-center rounded-full bg-white px-4 text-xs font-bold text-ink transition group-hover:bg-gold-300 sm:mt-4 sm:min-h-11 sm:text-sm">{visitShop} <ChevronRight size={15} aria-hidden="true" /></span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5" role="group" aria-label={title}>
          {banners.map((ad, index) => (
            <button key={ad.id} type="button" onClick={() => goTo(index)} aria-label={positionLabel.replace("{current}", String(index + 1)).replace("{total}", String(banners.length))} aria-current={activeIndex === index ? "true" : undefined} className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-6 bg-brand-600" : "w-2 bg-stone-300"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

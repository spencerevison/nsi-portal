"use client";

import { useRef, useSyncExternalStore } from "react";
import Image, { type StaticImageData } from "next/image";

import twilightHeadlands from "./photos/twilight-headlands.jpeg";
import mountainDusk from "./photos/mountain-dusk.jpeg";
import salalPath from "./photos/salal-path.jpeg";
import firsReflection from "./photos/firs-reflection.jpeg";
import cabinGoldenhour from "./photos/cabin-goldenhour.jpeg";
import seagrassTurquoise from "./photos/seagrass-turquoise.png";
import waterReflection from "./photos/water-reflection.jpeg";
import sandstone1 from "./photos/sandstone1.jpg";
import sandstone2 from "./photos/sandstone2.jpg";

import { SignInCard } from "./sign-in-card";

type Layout = "split" | "immersive";
type Photo = {
  src: StaticImageData;
  focal: string;
  layout: Layout;
};

const PHOTOS: readonly Photo[] = [
  // landscape heroes → split
  { src: twilightHeadlands, focal: "50% 55%", layout: "split" },
  { src: mountainDusk, focal: "50% 60%", layout: "split" },
  { src: salalPath, focal: "55% 45%", layout: "split" },
  { src: firsReflection, focal: "50% 40%", layout: "split" },
  { src: cabinGoldenhour, focal: "45% 50%", layout: "split" },

  // abstract/texture → immersive
  { src: seagrassTurquoise, focal: "50% 50%", layout: "immersive" },
  { src: waterReflection, focal: "50% 50%", layout: "immersive" },
  { src: sandstone1, focal: "50% 50%", layout: "immersive" },
  { src: sandstone2, focal: "50% 50%", layout: "immersive" },
];

const SPLIT_POOL = PHOTOS.filter((p) => p.layout === "split");
const IMMERSIVE_POOL = PHOTOS.filter((p) => p.layout === "immersive");

function pick(): Photo {
  const layout: Layout = Math.random() < 0.75 ? "split" : "immersive";
  const pool = layout === "split" ? SPLIT_POOL : IMMERSIVE_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

const noopSubscribe = () => () => {};

export function HeroRotation() {
  // Pick once on the client, cache in a ref so re-renders don't re-roll.
  // Server snapshot is null → we render a photo-less skeleton during SSR,
  // then swap in the real hero on hydration. Avoids hydration mismatch
  // without a setState-in-effect.
  const pickRef = useRef<Photo | null>(null);
  const photo = useSyncExternalStore(
    noopSubscribe,
    () => (pickRef.current ??= pick()),
    () => null,
  );

  // SSR / pre-hydration: render the split skeleton (photo-less) so the card
  // sits in its final right-hand position. Split is the majority outcome
  // (~75%), so most loads avoid a visible layout shift when the pick resolves.
  // The ~25% of loads that end up immersive still re-layout once.
  if (!photo) return <Split photo={null} />;

  return photo.layout === "split" ? (
    <Split photo={photo} />
  ) : (
    <Immersive photo={photo} />
  );
}

function Split({ photo }: { photo: Photo | null }) {
  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-[38vh_1fr] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:grid-rows-1">
      <aside className="bg-accent-900 relative overflow-hidden">
        {photo ? (
          <>
            <Image
              src={photo.src}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="(max-width: 860px) 100vw, 55vw"
              className="object-cover"
              style={{ objectPosition: photo.focal }}
            />
            {/* subtle top/bottom scrim — frames the photo against the cream panel */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(12,27,31,0.18) 0%, transparent 25%, transparent 55%, rgba(12,27,31,0.3) 100%)",
              }}
            />
          </>
        ) : null}
      </aside>
      <main className="bg-cream-100 flex items-center justify-center px-6 py-8 md:p-12">
        <SignInCard />
      </main>
    </div>
  );
}

function Immersive({ photo }: { photo: Photo }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-12">
      <Image
        src={photo.src}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="z-0 object-cover"
        style={{ objectPosition: photo.focal }}
      />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(251,248,242,0.12) 0%, rgba(12,27,31,0.38) 100%), linear-gradient(180deg, rgba(12,27,31,0.22) 0%, rgba(12,27,31,0.18) 100%)",
        }}
      />
      <div
        className="relative z-[2] w-full max-w-[420px] px-6 pt-7 pb-6 md:px-10 md:pt-10 md:pb-8"
        style={{
          background: "rgba(251, 248, 242, 0.88)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(251, 248, 242, 0.65)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.4) inset, 0 24px 60px -20px rgba(12,27,31,0.45), 0 8px 20px -12px rgba(12,27,31,0.3)",
        }}
      >
        <SignInCard />
      </div>
    </div>
  );
}

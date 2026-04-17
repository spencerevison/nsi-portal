import Image from "next/image";

type Variant = "onphoto" | "onpaper";

export function NsiMark({ variant }: { variant: Variant }) {
  const onphoto = variant === "onphoto";

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo-nsi.svg"
        alt=""
        width={36}
        height={36}
        priority
        className="block h-9 w-9 rounded-lg"
      />
      <div className="flex flex-col leading-none">
        <span
          className={
            onphoto
              ? "text-cream-100 text-[14px] font-semibold whitespace-nowrap [text-shadow:0_1px_10px_rgba(0,0,0,0.25)]"
              : "text-accent-900 text-[14px] font-semibold whitespace-nowrap"
          }
        >
          NSI Community Portal
        </span>
        <span
          className={
            onphoto
              ? "text-cream-100/80 mt-[5px] font-mono text-[11px] whitespace-nowrap [text-shadow:0_1px_10px_rgba(0,0,0,0.25)]"
              : "mt-[5px] font-mono text-[11px] whitespace-nowrap text-[oklch(0.5_0_0)]"
          }
        >
          North Secretary Island
        </span>
      </div>
    </div>
  );
}

/** The tricycle mark, tinted with the current text color (the PNG is used as a mask). */
export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="TrikeIt!"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        maskImage: "url(/logo.png)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 text-brand-navy ${className}`}>
      <Logo className="size-9" />
      <span className="text-xl font-bold tracking-tight">TrikeIt!</span>
    </span>
  );
}

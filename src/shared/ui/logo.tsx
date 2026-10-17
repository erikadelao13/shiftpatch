type LogoProps = {
  tone: "on-brand" | "on-light";
  className?: string;
};

// The mark is decorative: the visible wordmark names the product.
export function Logo({ tone, className = "" }: LogoProps) {
  const onBrand = tone === "on-brand";
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        aria-hidden="true"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        className={onBrand ? "text-gold" : "text-brand-800"}
      >
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10 2v28M22 2v28M2 10h28M2 22h28"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <path
          d="M10 16h4a2 2 0 0 0 2-2v-4M22 16h-4a2 2 0 0 0-2 2v4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-display text-2xl leading-none ${
          onBrand ? "text-on-brand" : "text-brand-800"
        }`}
      >
        ShiftPatch
      </span>
    </span>
  );
}

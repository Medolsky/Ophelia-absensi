interface InstitutionLogoProps {
  logo?: string | null;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function InstitutionLogo({
  logo,
  name,
  className = "",
  size = "md",
}: InstitutionLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-sm",
    md: "h-8 w-8 text-base",
    lg: "h-12 w-12 text-2xl",
    xl: "h-16 w-16 text-4xl",
  };

  if (logo && (logo.startsWith("/") || logo.startsWith("http"))) {
    return (
      <img
        src={logo}
        alt={name || "Institution Logo"}
        className={`${sizeClasses[size]} ${className} object-contain rounded-lg shrink-0`}
      />
    );
  }

  return (
    <span className={`${sizeClasses[size]} ${className} flex items-center justify-center shrink-0`}>
      {logo || "🏛️"}
    </span>
  );
}

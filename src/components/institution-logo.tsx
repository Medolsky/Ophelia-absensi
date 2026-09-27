import { Building2 } from "lucide-react";

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

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
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
    <span className={`${sizeClasses[size]} ${className} flex items-center justify-center shrink-0 text-neutral-400 bg-[#161616] rounded-lg border border-[#262626]`}>
      <Building2 className={iconSizes[size]} />
    </span>
  );
}

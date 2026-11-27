"use client";

import { useState } from "react";
import { getDiscordAvatarUrl } from "@/lib/discord-sync";

interface UserAvatarProps {
  userId?: string | null;
  userAvatar?: string | null;
  name?: string | null;
  className?: string;
}

export function UserAvatar({
  userId,
  userAvatar,
  name,
  className = "h-8 w-8 rounded-lg object-cover border border-[#333] shrink-0",
}: UserAvatarProps) {
  const cleanId = userId?.replace("discord-", "");
  const initialSrc = getDiscordAvatarUrl(cleanId, userAvatar);
  const fallbackSrc = getDiscordAvatarUrl(cleanId, null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const effectiveSrc = failedSrc === initialSrc ? fallbackSrc : initialSrc;

  return (
    <img
      src={effectiveSrc}
      alt={name || "Petugas"}
      className={className}
      onError={() => {
        if (effectiveSrc !== fallbackSrc) {
          setFailedSrc(initialSrc);
        }
      }}
    />
  );
}

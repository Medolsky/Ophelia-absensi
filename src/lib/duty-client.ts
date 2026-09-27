/**
 * Client-side duty state synchronization utilities
 */

export function clearClientDutyState(institutionSlug?: string): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Remove all duty items in localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("ophelia_active_duty") ||
          key === "ophelia_current_active_duty" ||
          key.includes("active_duty"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Record when off duty occurred
    const offDutyTimestamp = Date.now().toString();
    localStorage.setItem("ophelia_last_off_duty_timestamp", offDutyTimestamp);

    // 2. Clear all duty cookies with immediate expiration
    const expireStr = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    document.cookie = `ophelia_active_duty=; ${expireStr}`;
    document.cookie = `ophelia_current_active_duty=; ${expireStr}`;

    const slugsToClean = [
      institutionSlug,
      institutionSlug ? institutionSlug.replace("inst-", "") : "",
      "police",
      "medical",
      "mechanic",
      "restaurant",
      "pemerintah",
    ].filter(Boolean) as string[];

    slugsToClean.forEach((s) => {
      document.cookie = `ophelia_active_duty_${s}=; ${expireStr}`;
      document.cookie = `ophelia_active_duty_inst-${s}=; ${expireStr}`;
    });

    // 3. Dispatch global duty changed event
    window.dispatchEvent(
      new CustomEvent("ophelia_duty_changed", {
        detail: { status: "OFF_DUTY", institutionSlug, timestamp: offDutyTimestamp },
      })
    );
  } catch (err) {
    console.warn("clearClientDutyState error:", err);
  }
}

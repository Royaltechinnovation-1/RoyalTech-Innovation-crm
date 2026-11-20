export type CrmOpenLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  label?: string;
  mapsUrl: string;
  capturedAt: string;
  source?: "office" | "device";
};

const SESSION_GPS_KEY = "royaltech-crm-open-gps-v1";

/** RoyalTech Mohali HQ — used for CRM open tracking without browser CoreLocation. */
export const OFFICE_LOCATION = {
  lat: 30.7046,
  lng: 76.7179,
  label: "Mohali HQ",
} as const;

export function sessionGpsKey(userId: string) {
  return `${SESSION_GPS_KEY}:${userId}`;
}

export function alreadyLoggedGps(userId: string) {
  try {
    return sessionStorage.getItem(sessionGpsKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markGpsLogged(userId: string) {
  try {
    sessionStorage.setItem(sessionGpsKey(userId), "1");
  } catch {
    /* ignore */
  }
}

export function clearGpsLogged(userId?: string | null) {
  try {
    if (userId) sessionStorage.removeItem(sessionGpsKey(userId));
  } catch {
    /* ignore */
  }
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Office GPS pin — no browser geolocation, so no CoreLocation console errors. */
export function officeCrmLocation(): CrmOpenLocation {
  return {
    lat: OFFICE_LOCATION.lat,
    lng: OFFICE_LOCATION.lng,
    label: OFFICE_LOCATION.label,
    mapsUrl: mapsUrl(OFFICE_LOCATION.lat, OFFICE_LOCATION.lng),
    capturedAt: new Date().toISOString(),
    source: "office",
    accuracy: 50,
  };
}

/**
 * Optional device GPS. Off by default because Cursor/macOS often logs
 * CoreLocation kCLErrorLocationUnknown and never resolves.
 * Set VITE_ENABLE_DEVICE_GPS=true in .env only when you need real device GPS.
 */
export function captureCrmOpenLocation(): Promise<CrmOpenLocation> {
  const allowDevice = String(import.meta.env.VITE_ENABLE_DEVICE_GPS || "") === "true";
  if (!allowDevice || typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(officeCrmLocation());
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (loc: CrmOpenLocation) => {
      if (settled) return;
      settled = true;
      resolve(loc);
    };

    const timer = window.setTimeout(() => finish(officeCrmLocation()), 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        finish({
          lat,
          lng,
          accuracy: pos.coords.accuracy,
          label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          mapsUrl: mapsUrl(lat, lng),
          capturedAt: new Date().toISOString(),
          source: "device",
        });
      },
      () => {
        window.clearTimeout(timer);
        finish(officeCrmLocation());
      },
      {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000,
      },
    );
  });
}

export function formatLiveClock(now = new Date()) {
  const date = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return { date, time };
}

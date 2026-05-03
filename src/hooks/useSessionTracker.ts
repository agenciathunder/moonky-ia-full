import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function detectDevice(): { device_type: string; browser: string; os: string } {
  const ua = navigator.userAgent;
  let device_type = "desktop";
  if (/Mobi|Android/i.test(ua)) device_type = "mobile";
  else if (/Tablet|iPad/i.test(ua)) device_type = "tablet";

  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";

  return { device_type, browser, os };
}

interface GeoData {
  ip: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

let cachedGeo: GeoData | null = null;
let geoPromise: Promise<GeoData> | null = null;

function fetchGeoData(): Promise<GeoData> {
  if (cachedGeo) return Promise.resolve(cachedGeo);
  if (geoPromise) return geoPromise;

  geoPromise = fetch("https://ipapi.co/json/", { cache: "force-cache" })
    .then(res => res.json())
    .then(data => {
      cachedGeo = {
        ip: data.ip || null,
        city: data.city || null,
        state: data.region || null,
        country: data.country_name || null,
      };
      return cachedGeo;
    })
    .catch(() => {
      return fetch("http://ip-api.com/json/?fields=query,city,regionName,country")
        .then(res => res.json())
        .then(data => {
          cachedGeo = {
            ip: data.query || null,
            city: data.city || null,
            state: data.regionName || null,
            country: data.country || null,
          };
          return cachedGeo;
        })
        .catch(() => {
          cachedGeo = { ip: null, city: null, state: null, country: null };
          return cachedGeo;
        });
    });

  return geoPromise;
}

// Use a global session ID to prevent duplicates across HMR/re-renders
const SESSION_KEY = "__moonky_session_id";

export function useSessionTracker() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);

  const createSession = useCallback(async () => {
    if (!user) return;

    // If we already have a session for this tab, just update heartbeat
    const existingId = sessionStorage.getItem(SESSION_KEY);
    if (existingId) {
      await supabase
        .from("user_sessions")
        .update({ last_activity_at: new Date().toISOString(), is_active: true })
        .eq("id", existingId);
      return;
    }

    const token = `${user.id}-${Date.now()}`;
    const info = detectDevice();
    const geo = await fetchGeoData();

    const { data, error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: user.id,
        user_email: user.email ?? null,
        session_token: token,
        ...info,
        ip_address: geo.ip ?? null,
        location_city: geo.city ?? null,
        location_state: geo.state ?? null,
        is_active: true,
      })
      .select("id")
      .single();

    if (!error && data) {
      sessionStorage.setItem(SESSION_KEY, data.id);
    }
  }, [user]);

  const heartbeat = useCallback(async () => {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid || !user) return;
    await supabase
      .from("user_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", sid);
  }, [user]);

  const endSession = useCallback(async () => {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) return;
    await supabase
      .from("user_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", sid);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    if (!user) {
      const sid = sessionStorage.getItem(SESSION_KEY);
      if (sid) endSession();
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    createSession();

    // Heartbeat every 30 seconds
    intervalRef.current = setInterval(heartbeat, 30_000);

    const handleBeforeUnload = () => {
      const sid = sessionStorage.getItem(SESSION_KEY);
      if (sid) {
        const payload = JSON.stringify({ is_active: false, ended_at: new Date().toISOString() });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sid}`;
        const headers = {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=minimal",
        };
        // sendBeacon doesn't support PATCH, use fetch keepalive
        fetch(url, { method: "PATCH", headers, body: payload, keepalive: true }).catch(() => {});
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, createSession, heartbeat, endSession]);
}

export function logActivity(
  action: string,
  options?: {
    resource_type?: string;
    resource_id?: string;
    resource_name?: string;
    establishment_id?: string;
    establishment_name?: string;
    details?: any;
    result?: string;
  }
) {
  const info = detectDevice();
  
  Promise.all([
    supabase.auth.getUser(),
    fetchGeoData(),
  ]).then(([{ data }, geo]) => {
    const u = data?.user;
    supabase.from("activity_logs").insert({
      user_id: u?.id ?? null,
      user_email: u?.email ?? null,
      action,
      resource_type: options?.resource_type ?? null,
      resource_id: options?.resource_id ?? null,
      resource_name: options?.resource_name ?? null,
      establishment_id: options?.establishment_id ?? null,
      establishment_name: options?.establishment_name ?? null,
      details: options?.details ?? null,
      result: options?.result ?? "success",
      device_type: info.device_type,
      browser: info.browser,
      os: info.os,
      ip_address: geo.ip ?? null,
      location_city: geo.city ?? null,
      location_state: geo.state ?? null,
      location_country: geo.country ?? null,
    }).then(() => {});
  });
}

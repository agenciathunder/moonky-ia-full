import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSessionTracker, logActivity } from "@/hooks/useSessionTracker";
import { useAuth } from "@/contexts/AuthContext";

export default function ActivityTracker() {
  useSessionTracker();
  const { user } = useAuth();
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  // Log page views
  useEffect(() => {
    const path = location.pathname;
    if (path === prevPath.current && prevPath.current !== path) return;
    prevPath.current = path;

    let section = "public";
    if (path.startsWith("/admin-master")) section = "admin_master";
    else if (path.startsWith("/admin")) section = "admin_panel";
    else if (path.startsWith("/loja/")) section = "store";
    else if (path === "/") section = "landing_page";
    else if (path.startsWith("/auth")) section = "auth";

    logActivity("page_view", {
      resource_type: section,
      resource_name: path,
    });
  }, [location.pathname]);

  // Log login events
  const loggedLogin = useRef(false);
  useEffect(() => {
    if (user && !loggedLogin.current) {
      loggedLogin.current = true;
      logActivity("login", { resource_type: "auth", result: "success" });
    }
    if (!user) loggedLogin.current = false;
  }, [user]);

  return null;
}

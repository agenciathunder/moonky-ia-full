-- Activity Logs Table - Stores all user activities (immutable)
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_role text, -- admin, moderator, user, employee
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  establishment_name text,
  action text NOT NULL, -- login, logout, create, update, delete, view, sale, withdrawal, etc.
  resource_type text, -- event, product, ticket, plan, user, order, wallet, etc.
  resource_id uuid,
  resource_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  device_type text, -- desktop, mobile, tablet
  browser text,
  os text,
  location_city text,
  location_state text,
  location_country text,
  result text DEFAULT 'success', -- success, error, blocked
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Sessions Table - Track user sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  session_token text UNIQUE NOT NULL,
  device_type text,
  browser text,
  os text,
  ip_address text,
  location_city text,
  location_state text,
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now() NOT NULL,
  last_activity_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz
);

-- Security Alerts Table - Track suspicious activities
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  alert_type text NOT NULL, -- invalid_login, suspicious_access, multiple_sessions, critical_action
  severity text DEFAULT 'medium', -- low, medium, high, critical
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  location text,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Logs Access Audit - Track who accessed the logs (immutable)
CREATE TABLE public.logs_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  user_email text,
  action text NOT NULL, -- view_logs, export_logs, filter_logs
  filters_applied jsonb DEFAULT '{}',
  records_accessed integer DEFAULT 0,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_access_audit ENABLE ROW LEVEL SECURITY;

-- Enable realtime for sessions and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- RLS Policies for activity_logs (only master admins can view)
CREATE POLICY "Master admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Any authenticated user can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies - logs are immutable

-- RLS Policies for user_sessions
CREATE POLICY "Master admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Any authenticated user can insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Master admins can manage all sessions"
  ON public.user_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for security_alerts
CREATE POLICY "Master admins can manage security alerts"
  ON public.security_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for logs_access_audit
CREATE POLICY "Master admins can view logs access audit"
  ON public.logs_access_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admins can insert logs access audit"
  ON public.logs_access_audit FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_establishment_id ON public.activity_logs(establishment_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource_type ON public.activity_logs(resource_type);
CREATE INDEX idx_activity_logs_result ON public.activity_logs(result);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);

CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_alert_type ON public.security_alerts(alert_type);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_is_resolved ON public.security_alerts(is_resolved);
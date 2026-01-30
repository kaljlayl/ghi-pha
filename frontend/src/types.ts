export type Signal = {
  id: string;
  beacon_event_id?: string | null;
  disease: string;
  country: string;
  location?: string | null;
  date_reported: string;
  cases: number;
  deaths: number;
  case_fatality_rate?: number | null;
  description?: string | null;
  source_url: string;
  triage_status: string;
  priority_score?: number | null;
  current_status: string;
  created_at: string;
  updated_at: string;
  // Geocoding fields
  latitude?: number | null;
  longitude?: number | null;
};

export type Assessment = {
  id: string;
  signal_id: string;
  assessment_type: 'IHR Annex 2' | 'RRA';

  // IHR Annex 2 fields
  ihr_question_1?: boolean | null;
  ihr_question_1_notes?: string | null;
  ihr_question_2?: boolean | null;
  ihr_question_2_notes?: string | null;
  ihr_question_3?: boolean | null;
  ihr_question_3_notes?: string | null;
  ihr_question_4?: boolean | null;
  ihr_question_4_notes?: string | null;
  ihr_decision?: string | null;

  // RRA fields
  rra_hazard_assessment?: Record<string, any> | null;
  rra_exposure_assessment?: Record<string, any> | null;
  rra_context_assessment?: Record<string, any> | null;
  rra_overall_risk?: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | null;
  rra_confidence_level?: 'Low' | 'Moderate' | 'High' | null;
  rra_key_uncertainties?: string[] | null;
  rra_recommendations?: string[] | null;

  // Status and outcome
  status: string;
  assigned_to: string;
  reviewed_by?: string | null;
  outcome_decision?: string | null;
  outcome_justification?: string | null;

  // Timestamps
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at: string;
};

export type Escalation = {
  id: string;
  signal_id: string;
  assessment_id: string;
  escalation_level: string;
  priority: 'Critical' | 'High' | 'Medium';
  escalation_reason: string;
  recommended_actions: string[];
  director_status: 'Pending Review' | 'Approved' | 'Rejected';
  director_decision?: string | null;
  director_notes?: string | null;
  actions_taken?: string[] | null;
  reviewed_by?: string | null;
  escalated_at: string;
  escalated_by: string;
  reviewed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type DirectorDecision = {
  director_decision: 'approve' | 'reject' | 'request_more_info';
  actions_taken: string[];
  director_notes: string;
};

export type Notification = {
  id: string;
  recipient_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string | null;
  signal_id?: string | null;
  assessment_id?: string | null;
  escalation_id?: string | null;
  read: boolean;
  read_at?: string | null;
  priority: string;
  created_at: string;
};

// Map visualization types
export type MapMarkerData = {
  id: string;
  latitude: number;
  longitude: number;
  priority_score: number;
  disease: string;
  country: string;
  location?: string | null;
  cases: number;
  deaths: number;
  triage_status: string;
  date_reported: string;
};

export type HeatmapPointData = {
  latitude: number;
  longitude: number;
  intensity: number;
};

export type MapDataResponse = {
  markers: MapMarkerData[];
  heatmap_points: HeatmapPointData[];
  total_signals: number;
};

export type ScraperStatus = {
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_sync_count: number;
  next_allowed_sync_at: string | null;
  can_sync_now: boolean;
};

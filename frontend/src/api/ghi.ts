import type { Signal, Assessment, Escalation, DirectorDecision } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'ghi_auth_token';

// Helper to get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Helper to create headers with auth token
const getHeaders = (additionalHeaders: Record<string, string> = {}): HeadersInit => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Helper to handle API responses and 401 errors
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
    throw new Error('Unauthorized - please login again');
  }

  if (!response.ok) {
    throw new Error(`API error (${response.status})`);
  }

  return response.json();
};

export const fetchSignals = async (
  status?: string,
  disease?: string,
  location?: string
): Promise<Signal[]> => {
  const url = new URL(`${API_BASE_URL}/api/v1/signals`);
  if (status) url.searchParams.set('status', status);
  if (disease) url.searchParams.set('disease', disease);
  if (location) url.searchParams.set('location', location);

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
  });
  return handleResponse<Signal[]>(response);
};

export type FilterOptions = {
  diseases: string[];
  locations: string[];
};

export const fetchFilterOptions = async (): Promise<FilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/signals/filters`, {
    headers: getHeaders(),
  });
  return handleResponse<FilterOptions>(response);
};

export const getSignal = async (id: string): Promise<Signal> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/signals/${id}`, {
    headers: getHeaders(),
  });
  return handleResponse<Signal>(response);
};

export const createAssessment = async (
  signalId: string,
  assessmentType: 'IHR Annex 2' | 'RRA'
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      signal_id: signalId,
      assessment_type: assessmentType,
    }),
  });
  return handleResponse<Assessment>(response);
};

export const updateAssessment = async (
  id: string,
  data: Partial<Assessment>
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments/${id}`, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse<Assessment>(response);
};

export const completeAssessment = async (
  id: string,
  outcome: 'archive' | 'escalate',
  justification: string
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments/${id}/complete`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ outcome, justification }),
  });
  return handleResponse<Assessment>(response);
};

export const getPendingEscalations = async (): Promise<Escalation[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/pending`, {
    headers: getHeaders(),
  });
  return handleResponse<Escalation[]>(response);
};

export const getEscalationDetails = async (
  id: string
): Promise<Escalation & { signal: Signal; assessment: Assessment }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/${id}`, {
    headers: getHeaders(),
  });
  return handleResponse<Escalation & { signal: Signal; assessment: Assessment }>(response);
};

export const submitDirectorDecision = async (
  id: string,
  data: DirectorDecision
): Promise<Escalation> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/${id}/decision`, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse<Escalation>(response);
};

export const pollBeacon = async (): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/signals/poll-beacon`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse<{ message: string }>(response);
};

import type { Signal, Assessment, Escalation, DirectorDecision } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export const fetchSignals = async (status?: string): Promise<Signal[]> => {
  const url = new URL(`${API_BASE_URL}/api/v1/signals`);
  if (status) {
    url.searchParams.set('status', status);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to load signals (${response.status})`);
  }
  return response.json();
};

export const getSignal = async (id: string): Promise<Signal> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/signals/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load signal ${id} (${response.status})`);
  }
  return response.json();
};

export const createAssessment = async (
  signalId: string,
  assessmentType: 'IHR Annex 2' | 'RRA'
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signal_id: signalId,
      assessment_type: assessmentType,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create assessment (${response.status})`);
  }
  return response.json();
};

export const updateAssessment = async (
  id: string,
  data: Partial<Assessment>
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update assessment (${response.status})`);
  }
  return response.json();
};

export const completeAssessment = async (
  id: string,
  outcome: 'archive' | 'escalate',
  justification: string
): Promise<Assessment> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/assessments/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome, justification }),
  });
  if (!response.ok) {
    throw new Error(`Failed to complete assessment (${response.status})`);
  }
  return response.json();
};

export const getPendingEscalations = async (): Promise<Escalation[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/pending`);
  if (!response.ok) {
    throw new Error(`Failed to load escalations (${response.status})`);
  }
  return response.json();
};

export const getEscalationDetails = async (
  id: string
): Promise<Escalation & { signal: Signal; assessment: Assessment }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load escalation ${id} (${response.status})`);
  }
  return response.json();
};

export const submitDirectorDecision = async (
  id: string,
  decision: DirectorDecision
): Promise<Escalation> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/escalations/${id}/decision`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision),
  });
  if (!response.ok) {
    throw new Error(`Failed to submit director decision (${response.status})`);
  }
  return response.json();
};

export const pollBeacon = async (): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/signals/poll-beacon`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to poll beacon (${response.status})`);
  }
  return response.json();
};

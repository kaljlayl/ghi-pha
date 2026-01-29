import { useState, useEffect } from 'react';
import { getPendingEscalations, getEscalationDetails, submitDirectorDecision } from '../api/ghi';
import type { Escalation, Signal, Assessment } from '../types';

type EscalationWithDetails = Escalation & { signal: Signal; assessment: Assessment };

const AVAILABLE_ACTIONS = [
  'Activate EOC',
  'Notify WHO',
  'Issue national alert',
  'Convene expert committee',
  'Deploy response team',
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'text-ghi-critical border-ghi-critical/30 bg-ghi-critical/10 shadow-[0_0_10px_rgba(255,49,49,0.1)]';
    case 'High':
      return 'text-ghi-warning border-ghi-warning/30 bg-ghi-warning/10';
    case 'Medium':
      return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    default:
      return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
  }
};

const EscalationCard = ({
  escalation,
  onSelect,
  isExpanded,
}: {
  escalation: Escalation;
  onSelect: () => void;
  isExpanded: boolean;
}) => {
  const [details, setDetails] = useState<EscalationWithDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request_more_info' | null>(null);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && !details && !loadingDetails) {
      setLoadingDetails(true);
      getEscalationDetails(escalation.id)
        .then(setDetails)
        .catch((err) => console.error('Failed to load details:', err))
        .finally(() => setLoadingDetails(false));
    }
  }, [isExpanded, details, loadingDetails, escalation.id]);

  const handleSubmit = async () => {
    if (!decision) {
      setSubmitError('Please select a decision');
      return;
    }
    if (decision === 'approve' && actionsTaken.length === 0) {
      setSubmitError('Please select at least one action for approved escalations');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitDirectorDecision(escalation.id, {
        decision,
        actions_taken: actionsTaken,
        notes,
      });
      // Success - parent will refresh list
      onSelect(); // Close the expanded view
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAction = (action: string) => {
    setActionsTaken((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  return (
    <div
      className={`glass-panel rounded-3xl border transition-all duration-500 ${
        isExpanded
          ? 'border-ghi-teal/30 shadow-[0_0_30px_rgba(0,242,255,0.1)]'
          : 'border-white/5 hover:border-ghi-blue/30'
      } relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-ghi-teal/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-ghi-teal/10 transition-all"></div>

      {/* Card Header - Always Visible */}
      <div
        onClick={() => !isExpanded && onSelect()}
        className={`p-8 relative z-10 ${!isExpanded ? 'cursor-pointer' : ''}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${getPriorityColor(
                  escalation.priority
                )}`}
              >
                {escalation.priority} Priority
              </span>
              <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] bg-ghi-blue/10 text-ghi-blue border border-ghi-blue/20">
                {escalation.escalation_level}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              {details?.signal?.disease || 'Loading...'}
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {details?.signal?.country || 'Loading...'}{' '}
                {details?.signal?.location ? `// ${details.signal.location}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Status</p>
            <p className="text-ghi-teal font-black text-sm uppercase neon-text">
              {escalation.director_status}
            </p>
          </div>
        </div>

        <div className="py-4 border-y border-white/5">
          <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-2">
            Escalation Reason
          </p>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">{escalation.escalation_reason}</p>
        </div>

        {!isExpanded && (
          <div className="mt-4">
            <button className="w-full px-5 py-3 bg-ghi-teal/10 hover:bg-ghi-teal/20 text-ghi-teal text-[10px] font-black tracking-[0.2em] rounded-xl transition-all border border-ghi-teal/30 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] uppercase">
              Review & Decide
            </button>
          </div>
        )}
      </div>

      {/* Expanded Details & Decision Form */}
      {isExpanded && (
        <div className="px-8 pb-8 relative z-10 space-y-6 border-t border-white/5">
          {loadingDetails ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 border-2 border-ghi-teal/20 border-t-ghi-teal rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">
                Loading details...
              </p>
            </div>
          ) : details ? (
            <>
              {/* Signal Details */}
              <div className="grid grid-cols-3 gap-6 py-4">
                <div>
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">
                    Reported Cases
                  </p>
                  <p className="text-white font-black text-lg">{details.signal.cases}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">
                    Confirmed Deaths
                  </p>
                  <p className="text-white font-black text-lg">{details.signal.deaths}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">
                    Fatal Ratio
                  </p>
                  <p className="text-ghi-critical font-black text-lg">
                    {details.signal.case_fatality_rate ??
                      (details.signal.cases > 0
                        ? Math.round((details.signal.deaths / details.signal.cases) * 1000) / 10
                        : 0)}
                    %
                  </p>
                </div>
              </div>

              {/* Assessment Summary */}
              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-3">
                  Assessment Summary
                </p>
                <p className="text-slate-300 text-sm font-medium leading-relaxed mb-3">
                  {details.assessment.outcome_justification || 'No justification provided'}
                </p>
                {details.assessment.assessment_type === 'RRA' && details.assessment.rra_overall_risk && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Overall Risk:{' '}
                    </span>
                    <span className="text-ghi-warning font-black text-sm uppercase">
                      {details.assessment.rra_overall_risk}
                    </span>
                  </div>
                )}
              </div>

              {/* Recommended Actions */}
              {escalation.recommended_actions && escalation.recommended_actions.length > 0 && (
                <div>
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-3">
                    Recommended Actions
                  </p>
                  <ul className="space-y-2">
                    {escalation.recommended_actions.map((action, i) => (
                      <li
                        key={i}
                        className="text-slate-300 text-sm font-medium flex items-start gap-2"
                      >
                        <span className="text-ghi-teal mt-1">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Director Decision Form */}
              <div className="glass-panel p-6 rounded-2xl border border-ghi-teal/20 bg-ghi-teal/5">
                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">
                  Director Decision
                </h4>

                {/* Decision Radio Buttons */}
                <div className="space-y-3 mb-6">
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-3">
                    Select Decision
                  </p>
                  {['approve', 'reject', 'request_more_info'].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <input
                        type="radio"
                        name="decision"
                        value={opt}
                        checked={decision === opt}
                        onChange={(e) => setDecision(e.target.value as any)}
                        className="w-4 h-4 text-ghi-teal focus:ring-ghi-teal focus:ring-2"
                      />
                      <span className="text-slate-300 text-sm font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                        {opt.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Actions Taken Checkboxes */}
                <div className="mb-6">
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-3">
                    Actions Taken
                  </p>
                  <div className="space-y-2">
                    {AVAILABLE_ACTIONS.map((action) => (
                      <label
                        key={action}
                        className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={actionsTaken.includes(action)}
                          onChange={() => toggleAction(action)}
                          className="w-4 h-4 text-ghi-teal focus:ring-ghi-teal focus:ring-2 rounded"
                        />
                        <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">
                          {action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes Textarea */}
                <div className="mb-6">
                  <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-3">
                    Director Notes
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes or justification..."
                    rows={4}
                    className="w-full bg-ghi-navy/50 border border-white/10 text-slate-300 text-sm rounded-xl px-4 py-3 focus:ring-1 ring-ghi-teal transition-all outline-none resize-none"
                  />
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="mb-4 p-3 rounded-xl bg-ghi-critical/10 border border-ghi-critical/30">
                    <p className="text-ghi-critical text-[10px] uppercase tracking-widest font-black">
                      {submitError}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => onSelect()}
                    disabled={submitting}
                    className="flex-1 px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-black tracking-[0.2em] rounded-xl transition-all border border-white/5 hover:border-white/20 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-5 py-3 bg-ghi-teal/10 hover:bg-ghi-teal/20 text-ghi-teal text-[10px] font-black tracking-[0.2em] rounded-xl transition-all border border-ghi-teal/30 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Decision'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-ghi-critical text-[10px] uppercase tracking-widest font-black">
                Failed to load escalation details
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EscalationView = () => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEscalations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingEscalations();
      setEscalations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscalations();
  }, []);

  const handleSelect = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      // Refresh list when closing (in case decision was submitted)
      loadEscalations();
    } else {
      setExpandedId(id);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-ghi-teal/5 p-4 rounded-2xl border border-ghi-teal/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-ghi-teal shadow-[0_0_8px_#00F2FF]"></div>
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
            Director Review Queue
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-ghi-navy/50 border border-white/5">
            <p className="text-slate-500 text-[9px] font-black tracking-widest uppercase">
              Pending Escalations:{' '}
              <span className="text-ghi-teal neon-text">{escalations.length}</span>
            </p>
          </div>
          <button
            onClick={loadEscalations}
            disabled={loading}
            className="px-4 py-2 glass-panel hover:bg-white/5 text-slate-500 hover:text-white text-[9px] font-black tracking-[0.2em] rounded-xl transition-all border border-white/10 uppercase disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-panel p-8 rounded-3xl border border-ghi-critical/30 bg-ghi-critical/5 text-center">
          <p className="text-ghi-critical text-sm font-black uppercase tracking-widest mb-2">
            Error Loading Escalations
          </p>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest">{error}</p>
          <button
            onClick={loadEscalations}
            className="mt-4 px-5 py-3 bg-ghi-critical/10 hover:bg-ghi-critical/20 text-ghi-critical text-[10px] font-black tracking-[0.2em] rounded-xl transition-all border border-ghi-critical/30 uppercase"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && escalations.length === 0 && !error && (
        <div className="glass-panel p-10 rounded-3xl border border-ghi-blue/10 text-center">
          <div className="w-16 h-16 border-2 border-ghi-teal/20 border-t-ghi-teal rounded-full animate-spin mb-6 mx-auto shadow-[0_0_15px_rgba(0,242,255,0.2)]"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Loading pending escalations...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && escalations.length === 0 && !error && (
        <div className="glass-panel p-10 rounded-3xl border border-ghi-blue/10 text-center">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
            No escalations pending
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Escalated signals will appear here once an assessment is completed.
          </p>
        </div>
      )}

      {/* Escalation Cards */}
      {escalations.length > 0 && (
        <div className="space-y-6">
          {escalations.map((escalation) => (
            <EscalationCard
              key={escalation.id}
              escalation={escalation}
              onSelect={() => handleSelect(escalation.id)}
              isExpanded={expandedId === escalation.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EscalationView;

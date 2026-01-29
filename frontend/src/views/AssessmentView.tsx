import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSignal, createAssessment, updateAssessment, completeAssessment } from '../api/ghi';
import type { Signal, Assessment } from '../types';
import RRAForm from '../components/RRAForm';

const AssessmentView = () => {
  const { signalId } = useParams<{ signalId: string }>();

  // Signal state
  const [signal, setSignal] = useState<Signal | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [signalError, setSignalError] = useState<string | null>(null);

  // Assessment state
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentType, setAssessmentType] = useState<'IHR Annex 2' | 'RRA'>('IHR Annex 2');

  // IHR state
  const [ihrQuestion1, setIhrQuestion1] = useState<boolean | null>(null);
  const [ihrQuestion1Notes, setIhrQuestion1Notes] = useState('');
  const [ihrQuestion2, setIhrQuestion2] = useState<boolean | null>(null);
  const [ihrQuestion2Notes, setIhrQuestion2Notes] = useState('');
  const [ihrQuestion3, setIhrQuestion3] = useState<boolean | null>(null);
  const [ihrQuestion3Notes, setIhrQuestion3Notes] = useState('');
  const [ihrQuestion4, setIhrQuestion4] = useState<boolean | null>(null);
  const [ihrQuestion4Notes, setIhrQuestion4Notes] = useState('');

  // RRA state
  const [rraFormData, setRRAFormData] = useState<any>({});

  // UI state
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Load signal on mount
  useEffect(() => {
    if (!signalId) {
      setSignalLoading(false);
      return;
    }

    const loadSignal = async () => {
      try {
        setSignalLoading(true);
        setSignalError(null);
        const data = await getSignal(signalId);
        setSignal(data);
      } catch (err) {
        setSignalError(err instanceof Error ? err.message : 'Failed to load signal');
      } finally {
        setSignalLoading(false);
      }
    };

    loadSignal();
  }, [signalId]);

  // Load existing assessment if signal has one
  useEffect(() => {
    if (assessment) {
      setAssessmentType(assessment.assessment_type);

      // Load IHR data
      setIhrQuestion1(assessment.ihr_question_1 ?? null);
      setIhrQuestion1Notes(assessment.ihr_question_1_notes ?? '');
      setIhrQuestion2(assessment.ihr_question_2 ?? null);
      setIhrQuestion2Notes(assessment.ihr_question_2_notes ?? '');
      setIhrQuestion3(assessment.ihr_question_3 ?? null);
      setIhrQuestion3Notes(assessment.ihr_question_3_notes ?? '');
      setIhrQuestion4(assessment.ihr_question_4 ?? null);
      setIhrQuestion4Notes(assessment.ihr_question_4_notes ?? '');

      // Load RRA data if available
      if (assessment.rra_hazard_assessment || assessment.rra_exposure_assessment || assessment.rra_context_assessment) {
        setRRAFormData({
          pathogenCharacteristics: assessment.rra_hazard_assessment?.pathogenCharacteristics || '',
          severityCFR: assessment.rra_hazard_assessment?.severityCFR || null,
          transmissibility: assessment.rra_hazard_assessment?.transmissibility || [],
          countermeasures: assessment.rra_hazard_assessment?.countermeasures || [],
          evidenceQuality: assessment.rra_hazard_assessment?.evidenceQuality || null,
          populationAtRisk: assessment.rra_exposure_assessment?.populationAtRisk || '',
          exposurePathways: assessment.rra_exposure_assessment?.exposurePathways || [],
          geographicSpread: assessment.rra_exposure_assessment?.geographicSpread || null,
          attackRate: assessment.rra_exposure_assessment?.attackRate || null,
          healthSystemCapacity: assessment.rra_context_assessment?.healthSystemCapacity || '',
          responseCapabilities: assessment.rra_context_assessment?.responseCapabilities || '',
          availableResources: assessment.rra_context_assessment?.availableResources || '',
          keyConstraints: assessment.rra_context_assessment?.keyConstraints || '',
          overallRisk: assessment.rra_overall_risk || null,
          confidenceLevel: assessment.rra_confidence_level || null,
          keyUncertainties: assessment.rra_key_uncertainties || [],
          recommendations: assessment.rra_recommendations || [],
        });
      }
    }
  }, [assessment]);

  const handleSaveDraft = async () => {
    if (!signalId) return;

    try {
      setSaving(true);

      let formData: any = {};

      if (assessmentType === 'IHR Annex 2') {
        formData = {
          ihr_question_1: ihrQuestion1,
          ihr_question_1_notes: ihrQuestion1Notes || null,
          ihr_question_2: ihrQuestion2,
          ihr_question_2_notes: ihrQuestion2Notes || null,
          ihr_question_3: ihrQuestion3,
          ihr_question_3_notes: ihrQuestion3Notes || null,
          ihr_question_4: ihrQuestion4,
          ihr_question_4_notes: ihrQuestion4Notes || null,
        };
      } else {
        // RRA
        formData = {
          rra_hazard_assessment: {
            pathogenCharacteristics: rraFormData.pathogenCharacteristics,
            severityCFR: rraFormData.severityCFR,
            transmissibility: rraFormData.transmissibility,
            countermeasures: rraFormData.countermeasures,
            evidenceQuality: rraFormData.evidenceQuality,
          },
          rra_exposure_assessment: {
            populationAtRisk: rraFormData.populationAtRisk,
            exposurePathways: rraFormData.exposurePathways,
            geographicSpread: rraFormData.geographicSpread,
            attackRate: rraFormData.attackRate,
          },
          rra_context_assessment: {
            healthSystemCapacity: rraFormData.healthSystemCapacity,
            responseCapabilities: rraFormData.responseCapabilities,
            availableResources: rraFormData.availableResources,
            keyConstraints: rraFormData.keyConstraints,
          },
          rra_overall_risk: rraFormData.overallRisk,
          rra_confidence_level: rraFormData.confidenceLevel,
          rra_key_uncertainties: rraFormData.keyUncertainties,
          rra_recommendations: rraFormData.recommendations,
        };
      }

      if (assessment) {
        const updated = await updateAssessment(assessment.id, formData);
        setAssessment(updated);
      } else {
        const newAssessment = await createAssessment(signalId, assessmentType);
        const updated = await updateAssessment(newAssessment.id, formData);
        setAssessment(updated);
      }

      alert('Assessment saved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!assessment) {
      alert('Please save the assessment first');
      return;
    }

    const justification = prompt('Enter justification for archiving this assessment:');
    if (!justification) return;

    try {
      setActionInProgress(true);
      await completeAssessment(assessment.id, 'archive', justification);
      alert('Assessment archived successfully');
      // Optionally navigate away or refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive assessment');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEscalate = async () => {
    if (!assessment) {
      alert('Please save the assessment first');
      return;
    }

    const justification = prompt('Enter justification for escalating to Director:');
    if (!justification) return;

    try {
      setActionInProgress(true);
      await completeAssessment(assessment.id, 'escalate', justification);
      alert('Assessment escalated to Director successfully');
      // Optionally navigate away or refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to escalate assessment');
    } finally {
      setActionInProgress(false);
    }
  };

  // Loading state
  if (signalLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-100 animate-in fade-in slide-in-from-right-4 duration-1000">
        <div className="lg:col-span-3 glass-panel p-10 rounded-[2.5rem] border border-ghi-blue/10 min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-ghi-teal/20 border-t-ghi-teal rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-ghi-teal font-black text-xs tracking-[0.3em] uppercase neon-text">Loading Signal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (signalError || !signal) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-100 animate-in fade-in slide-in-from-right-4 duration-1000">
        <div className="lg:col-span-3 glass-panel p-10 rounded-[2.5rem] border border-red-500/20 min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-black text-xs tracking-[0.3em] uppercase mb-3">Error Loading Signal</p>
            <p className="text-slate-400 text-sm">{signalError || 'Signal not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  // No signal selected state
  if (!signalId) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-100 animate-in fade-in slide-in-from-right-4 duration-1000">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-panel p-8 rounded-3xl border border-ghi-blue/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-ghi-teal/5 blur-3xl rounded-full -mr-12 -mt-12"></div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ghi-teal shadow-[0_0_8px_#00F2FF]"></span>
              Assessment Context
            </h4>
            <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wider">No signal selected</h3>
            <p className="text-slate-400 text-[11px] italic leading-relaxed font-medium">
              Select a signal from Triage to start an Annex 2 or RRA assessment.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel p-10 rounded-[2.5rem] border border-ghi-blue/10 min-h-[600px] relative overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <p className="text-ghi-teal font-black text-xs tracking-[0.3em] uppercase neon-text">Awaiting Assignment</p>
            <p className="text-slate-500 text-[10px] mt-3 font-bold uppercase tracking-widest">
              Assessments will appear here once a signal is accepted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-100 animate-in fade-in slide-in-from-right-4 duration-1000">
      {/* Left Sidebar - Signal Context */}
      <div className="lg:col-span-1 space-y-8">
        <div className="glass-panel p-8 rounded-3xl border border-ghi-blue/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-ghi-teal/5 blur-3xl rounded-full -mr-12 -mt-12"></div>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ghi-teal shadow-[0_0_8px_#00F2FF]"></span>
            Assessment Context
          </h4>
          <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wider">{signal.disease}</h3>
          <p className="text-slate-400 text-[11px] italic leading-relaxed font-medium mb-6">
            {signal.country} {signal.location ? `- ${signal.location}` : ''}
          </p>

          <div className="space-y-4 pt-4 border-t border-slate-700/30">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Cases</span>
              <span className="text-sm font-black text-ghi-teal">{signal.cases}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Deaths</span>
              <span className="text-sm font-black text-red-400">{signal.deaths}</span>
            </div>
            {signal.case_fatality_rate && (
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CFR</span>
                <span className="text-sm font-black text-amber-400">{signal.case_fatality_rate.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {signal.beacon_event_id && (
            <div className="mt-6 pt-6 border-t border-slate-700/30">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Event ID</p>
              <p className="text-xs font-mono text-ghi-blue">{signal.beacon_event_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Assessment Form */}
      <div className="lg:col-span-2 glass-panel p-10 rounded-[2.5rem] border border-ghi-blue/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ghi-blue/5 blur-3xl rounded-full -mr-32 -mt-32"></div>

        <div className="relative z-10">
          {/* Assessment Type Selector */}
          <div className="mb-8 flex gap-3">
            <button
              onClick={() => !assessment && setAssessmentType('IHR Annex 2')}
              disabled={!!assessment}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                assessmentType === 'IHR Annex 2'
                  ? 'bg-ghi-blue/20 border-2 border-ghi-blue/50 text-ghi-blue shadow-[0_0_20px_rgba(77,159,255,0.15)]'
                  : 'bg-slate-800/30 border border-slate-700/30 text-slate-400 hover:bg-slate-800/50'
              } ${assessment ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              IHR Annex 2
            </button>
            <button
              onClick={() => !assessment && setAssessmentType('RRA')}
              disabled={!!assessment}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                assessmentType === 'RRA'
                  ? 'bg-purple-400/20 border-2 border-purple-400/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  : 'bg-slate-800/30 border border-slate-700/30 text-slate-400 hover:bg-slate-800/50'
              } ${assessment ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              RRA
            </button>
          </div>

          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wider flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full shadow-[0_0_12px] ${
              assessmentType === 'IHR Annex 2' ? 'bg-ghi-blue shadow-ghi-blue' : 'bg-purple-400 shadow-purple-400'
            }`}></span>
            {assessmentType === 'IHR Annex 2' ? 'IHR Annex 2 Assessment' : 'Rapid Risk Assessment (RRA)'}
          </h2>
          <p className="text-slate-400 text-xs mb-10 font-medium tracking-wide">
            {assessmentType === 'IHR Annex 2'
              ? 'Decision instrument for the assessment and notification of events that may constitute a PHEIC'
              : 'Comprehensive risk assessment covering hazard, exposure, context, and summary'}
          </p>

          {/* Conditional Form Rendering */}
          {assessmentType === 'IHR Annex 2' ? (
            <div className="space-y-8">
              {/* Question 1 */}
              <div className="border-l-2 border-ghi-teal/30 pl-6 py-2">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wide">
                  1. Is the public health impact of the event serious?
                </h3>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q1"
                      checked={ihrQuestion1 === true}
                      onChange={() => setIhrQuestion1(true)}
                      className="w-4 h-4 text-ghi-teal focus:ring-ghi-teal/50"
                    />
                    <span className="text-sm font-bold text-slate-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q1"
                      checked={ihrQuestion1 === false}
                      onChange={() => setIhrQuestion1(false)}
                      className="w-4 h-4 text-ghi-teal focus:ring-ghi-teal/50"
                    />
                    <span className="text-sm font-bold text-slate-300">No</span>
                  </label>
                </div>
                <textarea
                  value={ihrQuestion1Notes}
                  onChange={(e) => setIhrQuestion1Notes(e.target.value)}
                  placeholder="Notes and justification..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-teal/50 focus:ring-1 focus:ring-ghi-teal/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Question 2 */}
              <div className="border-l-2 border-ghi-blue/30 pl-6 py-2">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wide">
                  2. Is the event unusual or unexpected?
                </h3>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q2"
                      checked={ihrQuestion2 === true}
                      onChange={() => setIhrQuestion2(true)}
                      className="w-4 h-4 text-ghi-blue focus:ring-ghi-blue/50"
                    />
                    <span className="text-sm font-bold text-slate-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q2"
                      checked={ihrQuestion2 === false}
                      onChange={() => setIhrQuestion2(false)}
                      className="w-4 h-4 text-ghi-blue focus:ring-ghi-blue/50"
                    />
                    <span className="text-sm font-bold text-slate-300">No</span>
                  </label>
                </div>
                <textarea
                  value={ihrQuestion2Notes}
                  onChange={(e) => setIhrQuestion2Notes(e.target.value)}
                  placeholder="Notes and justification..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-blue/50 focus:ring-1 focus:ring-ghi-blue/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Question 3 */}
              <div className="border-l-2 border-amber-400/30 pl-6 py-2">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wide">
                  3. Is there a significant risk of international spread?
                </h3>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q3"
                      checked={ihrQuestion3 === true}
                      onChange={() => setIhrQuestion3(true)}
                      className="w-4 h-4 text-amber-400 focus:ring-amber-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q3"
                      checked={ihrQuestion3 === false}
                      onChange={() => setIhrQuestion3(false)}
                      className="w-4 h-4 text-amber-400 focus:ring-amber-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">No</span>
                  </label>
                </div>
                <textarea
                  value={ihrQuestion3Notes}
                  onChange={(e) => setIhrQuestion3Notes(e.target.value)}
                  placeholder="Notes and justification..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 resize-none"
                  rows={3}
                />
              </div>

              {/* Question 4 */}
              <div className="border-l-2 border-red-400/30 pl-6 py-2">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wide">
                  4. Is there a significant risk of international travel or trade restrictions?
                </h3>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q4"
                      checked={ihrQuestion4 === true}
                      onChange={() => setIhrQuestion4(true)}
                      className="w-4 h-4 text-red-400 focus:ring-red-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="q4"
                      checked={ihrQuestion4 === false}
                      onChange={() => setIhrQuestion4(false)}
                      className="w-4 h-4 text-red-400 focus:ring-red-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">No</span>
                  </label>
                </div>
                <textarea
                  value={ihrQuestion4Notes}
                  onChange={(e) => setIhrQuestion4Notes(e.target.value)}
                  placeholder="Notes and justification..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-red-400/50 focus:ring-1 focus:ring-red-400/50 resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <RRAForm initialData={rraFormData} onChange={setRRAFormData} />
          )}

          {/* Action Buttons */}
          <div className="mt-12 pt-8 border-t border-slate-700/30 flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving || actionInProgress}
              className="px-6 py-3 bg-ghi-teal/10 hover:bg-ghi-teal/20 border border-ghi-teal/30 rounded-xl text-sm font-black text-ghi-teal uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleArchive}
              disabled={saving || actionInProgress || !assessment}
              className="px-6 py-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 rounded-xl text-sm font-black text-slate-300 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Archive
            </button>
            <button
              onClick={handleEscalate}
              disabled={saving || actionInProgress || !assessment}
              className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-sm font-black text-amber-400 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Escalate to Director
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentView;

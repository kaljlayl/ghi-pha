import { useState } from 'react';

type RRAFormData = {
  // Tab 1: Hazard Assessment
  pathogenCharacteristics: string;
  severityCFR: number | null;
  transmissibility: string[];
  countermeasures: string[];
  evidenceQuality: 'High' | 'Moderate' | 'Low' | null;

  // Tab 2: Exposure Assessment
  populationAtRisk: string;
  exposurePathways: string[];
  geographicSpread: 'Localized' | 'Regional' | 'National' | 'International' | null;
  attackRate: number | null;

  // Tab 3: Context Assessment
  healthSystemCapacity: string;
  responseCapabilities: string;
  availableResources: string;
  keyConstraints: string;

  // Tab 4: Summary
  overallRisk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | null;
  confidenceLevel: 'Low' | 'Moderate' | 'High' | null;
  keyUncertainties: string[];
  recommendations: string[];
};

type RRAFormProps = {
  initialData?: Partial<RRAFormData>;
  onChange: (data: RRAFormData) => void;
};

const RRAForm = ({ initialData, onChange }: RRAFormProps) => {
  const [activeTab, setActiveTab] = useState<'hazard' | 'exposure' | 'context' | 'summary'>('hazard');

  const [formData, setFormData] = useState<RRAFormData>({
    pathogenCharacteristics: initialData?.pathogenCharacteristics || '',
    severityCFR: initialData?.severityCFR || null,
    transmissibility: initialData?.transmissibility || [],
    countermeasures: initialData?.countermeasures || [],
    evidenceQuality: initialData?.evidenceQuality || null,
    populationAtRisk: initialData?.populationAtRisk || '',
    exposurePathways: initialData?.exposurePathways || [],
    geographicSpread: initialData?.geographicSpread || null,
    attackRate: initialData?.attackRate || null,
    healthSystemCapacity: initialData?.healthSystemCapacity || '',
    responseCapabilities: initialData?.responseCapabilities || '',
    availableResources: initialData?.availableResources || '',
    keyConstraints: initialData?.keyConstraints || '',
    overallRisk: initialData?.overallRisk || null,
    confidenceLevel: initialData?.confidenceLevel || null,
    keyUncertainties: initialData?.keyUncertainties || [],
    recommendations: initialData?.recommendations || [],
  });

  // New item inputs for dynamic lists
  const [newUncertainty, setNewUncertainty] = useState('');
  const [newRecommendation, setNewRecommendation] = useState('');

  const updateFormData = (updates: Partial<RRAFormData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onChange(newData);
  };

  const toggleCheckbox = (field: 'transmissibility' | 'countermeasures' | 'exposurePathways', value: string) => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateFormData({ [field]: newValues });
  };

  const addUncertainty = () => {
    if (newUncertainty.trim()) {
      updateFormData({ keyUncertainties: [...formData.keyUncertainties, newUncertainty.trim()] });
      setNewUncertainty('');
    }
  };

  const removeUncertainty = (index: number) => {
    updateFormData({ keyUncertainties: formData.keyUncertainties.filter((_, i) => i !== index) });
  };

  const addRecommendation = () => {
    if (newRecommendation.trim()) {
      updateFormData({ recommendations: [...formData.recommendations, newRecommendation.trim()] });
      setNewRecommendation('');
    }
  };

  const removeRecommendation = (index: number) => {
    updateFormData({ recommendations: formData.recommendations.filter((_, i) => i !== index) });
  };

  const tabs = [
    { id: 'hazard' as const, label: 'Hazard Assessment', color: 'ghi-teal' },
    { id: 'exposure' as const, label: 'Exposure Assessment', color: 'ghi-blue' },
    { id: 'context' as const, label: 'Context Assessment', color: 'amber-400' },
    { id: 'summary' as const, label: 'Summary', color: 'purple-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? `bg-${tab.color}/20 border-2 border-${tab.color}/50 text-${tab.color} shadow-[0_0_20px_rgba(0,242,255,0.15)]`
                : 'bg-slate-800/30 border border-slate-700/30 text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Tab 1: Hazard Assessment */}
        {activeTab === 'hazard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Pathogen Characteristics */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Pathogen Characteristics
              </label>
              <textarea
                value={formData.pathogenCharacteristics}
                onChange={(e) => updateFormData({ pathogenCharacteristics: e.target.value })}
                placeholder="Describe pathogen type, virulence, mutations, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-teal/50 focus:ring-1 focus:ring-ghi-teal/50 resize-none"
                rows={4}
              />
            </div>

            {/* Severity CFR */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Severity CFR (%)
              </label>
              <input
                type="number"
                value={formData.severityCFR ?? ''}
                onChange={(e) => updateFormData({ severityCFR: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="e.g., 2.5"
                step="0.1"
                min="0"
                max="100"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-teal/50 focus:ring-1 focus:ring-ghi-teal/50"
              />
            </div>

            {/* Transmissibility */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Transmissibility
              </label>
              <div className="space-y-2">
                {['Airborne', 'Droplet', 'Contact', 'Vector-borne', 'Water/Food'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.transmissibility.includes(option)}
                      onChange={() => toggleCheckbox('transmissibility', option)}
                      className="w-4 h-4 rounded border-slate-600 text-ghi-teal focus:ring-ghi-teal/50"
                    />
                    <span className="text-sm font-bold text-slate-300 group-hover:text-ghi-teal transition-colors">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Countermeasures Available */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Countermeasures Available
              </label>
              <div className="space-y-2">
                {['Vaccine', 'Treatment', 'Prophylaxis', 'PPE', 'Surveillance'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.countermeasures.includes(option)}
                      onChange={() => toggleCheckbox('countermeasures', option)}
                      className="w-4 h-4 rounded border-slate-600 text-ghi-teal focus:ring-ghi-teal/50"
                    />
                    <span className="text-sm font-bold text-slate-300 group-hover:text-ghi-teal transition-colors">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Evidence Quality */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Evidence Quality
              </label>
              <div className="flex gap-6">
                {['High', 'Moderate', 'Low'].map(quality => (
                  <label key={quality} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="evidenceQuality"
                      checked={formData.evidenceQuality === quality}
                      onChange={() => updateFormData({ evidenceQuality: quality as 'High' | 'Moderate' | 'Low' })}
                      className="w-4 h-4 text-ghi-teal focus:ring-ghi-teal/50"
                    />
                    <span className="text-sm font-bold text-slate-300">{quality}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Exposure Assessment */}
        {activeTab === 'exposure' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Population at Risk */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Population at Risk
              </label>
              <textarea
                value={formData.populationAtRisk}
                onChange={(e) => updateFormData({ populationAtRisk: e.target.value })}
                placeholder="Describe vulnerable populations, demographics, age groups, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-blue/50 focus:ring-1 focus:ring-ghi-blue/50 resize-none"
                rows={4}
              />
            </div>

            {/* Exposure Pathways */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Exposure Pathways
              </label>
              <div className="space-y-2">
                {['Community', 'Healthcare', 'Travel', 'Occupational', 'Environmental'].map(option => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.exposurePathways.includes(option)}
                      onChange={() => toggleCheckbox('exposurePathways', option)}
                      className="w-4 h-4 rounded border-slate-600 text-ghi-blue focus:ring-ghi-blue/50"
                    />
                    <span className="text-sm font-bold text-slate-300 group-hover:text-ghi-blue transition-colors">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Geographic Spread */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Geographic Spread
              </label>
              <select
                value={formData.geographicSpread ?? ''}
                onChange={(e) => updateFormData({ geographicSpread: e.target.value as any || null })}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 focus:border-ghi-blue/50 focus:ring-1 focus:ring-ghi-blue/50"
              >
                <option value="">Select spread level</option>
                <option value="Localized">Localized</option>
                <option value="Regional">Regional</option>
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            {/* Attack Rate Estimate */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Attack Rate Estimate (%)
              </label>
              <input
                type="number"
                value={formData.attackRate ?? ''}
                onChange={(e) => updateFormData({ attackRate: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="e.g., 15.0"
                step="0.1"
                min="0"
                max="100"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-ghi-blue/50 focus:ring-1 focus:ring-ghi-blue/50"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Context Assessment */}
        {activeTab === 'context' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Health System Capacity */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Health System Capacity
              </label>
              <textarea
                value={formData.healthSystemCapacity}
                onChange={(e) => updateFormData({ healthSystemCapacity: e.target.value })}
                placeholder="Describe hospital beds, ICU capacity, healthcare workforce, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 resize-none"
                rows={4}
              />
            </div>

            {/* Response Capabilities */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Response Capabilities
              </label>
              <textarea
                value={formData.responseCapabilities}
                onChange={(e) => updateFormData({ responseCapabilities: e.target.value })}
                placeholder="Describe testing capacity, contact tracing, isolation facilities, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 resize-none"
                rows={4}
              />
            </div>

            {/* Available Resources */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Available Resources
              </label>
              <textarea
                value={formData.availableResources}
                onChange={(e) => updateFormData({ availableResources: e.target.value })}
                placeholder="Describe medical supplies, funding, international support, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 resize-none"
                rows={4}
              />
            </div>

            {/* Key Constraints */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Key Constraints
              </label>
              <textarea
                value={formData.keyConstraints}
                onChange={(e) => updateFormData({ keyConstraints: e.target.value })}
                placeholder="Describe resource limitations, logistical challenges, political factors, etc."
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 resize-none"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Overall Risk Level */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Overall Risk Level
              </label>
              <div className="flex flex-wrap gap-4">
                {['Very Low', 'Low', 'Moderate', 'High', 'Very High'].map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="overallRisk"
                      checked={formData.overallRisk === level}
                      onChange={() => updateFormData({ overallRisk: level as any })}
                      className="w-4 h-4 text-purple-400 focus:ring-purple-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Confidence Level
              </label>
              <div className="flex gap-6">
                {['Low', 'Moderate', 'High'].map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="confidenceLevel"
                      checked={formData.confidenceLevel === level}
                      onChange={() => updateFormData({ confidenceLevel: level as 'Low' | 'Moderate' | 'High' })}
                      className="w-4 h-4 text-purple-400 focus:ring-purple-400/50"
                    />
                    <span className="text-sm font-bold text-slate-300">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Key Uncertainties */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Key Uncertainties
              </label>
              <div className="space-y-3">
                {formData.keyUncertainties.map((uncertainty, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                    <span className="flex-1 text-sm text-slate-200">{uncertainty}</span>
                    <button
                      onClick={() => removeUncertainty(index)}
                      className="text-red-400 hover:text-red-300 text-xs font-black uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUncertainty}
                    onChange={(e) => setNewUncertainty(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addUncertainty()}
                    placeholder="Add uncertainty..."
                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/50"
                  />
                  <button
                    onClick={addUncertainty}
                    className="px-4 py-3 bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/30 rounded-xl text-xs font-black text-purple-400 uppercase tracking-wider transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Recommendations
              </label>
              <div className="space-y-3">
                {formData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                    <span className="flex-1 text-sm text-slate-200">{recommendation}</span>
                    <button
                      onClick={() => removeRecommendation(index)}
                      className="text-red-400 hover:text-red-300 text-xs font-black uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecommendation}
                    onChange={(e) => setNewRecommendation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecommendation()}
                    placeholder="Add recommendation..."
                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/50"
                  />
                  <button
                    onClick={addRecommendation}
                    className="px-4 py-3 bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/30 rounded-xl text-xs font-black text-purple-400 uppercase tracking-wider transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RRAForm;

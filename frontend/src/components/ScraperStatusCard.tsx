import { useScraperStatus } from '../hooks/useScraperStatus';

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'never';
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function ScraperStatusCard() {
  const { status, loading, syncing, syncError, triggerSync } = useScraperStatus(10000);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-ghi-blue/10 relative overflow-hidden group hover:border-ghi-blue/30 transition-all duration-500">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-ghi-teal/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-ghi-teal/10 transition-colors"></div>

      {/* Header with label */}
      <p className="text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase mb-3 relative z-10">
        Scraper Status
      </p>

      {/* Status display */}
      <div className="flex items-end justify-between relative z-10 mb-4">
        <div className="flex items-center gap-3">
          {/* Pulsing indicator dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              status?.is_active
                ? 'bg-ghi-teal shadow-[0_0_8px_#00F2FF] animate-pulse'
                : 'bg-slate-600'
            }`}
          ></div>

          {/* Status text */}
          <h3 className="text-2xl font-black text-white tracking-tighter">
            {loading ? '...' : status?.is_active ? 'SYNCING' : 'IDLE'}
          </h3>
        </div>
      </div>

      {/* Last sync info */}
      <div className="text-[10px] text-slate-500 font-bold mb-3 relative z-10">
        Last sync: {formatRelativeTime(status?.last_sync_at)}
        {status?.last_sync_count !== undefined && status.last_sync_count > 0 && (
          <span className="text-ghi-teal ml-2">({status.last_sync_count} signals)</span>
        )}
      </div>

      {/* Error display */}
      {(status?.last_sync_error || syncError) && (
        <div className="text-[9px] text-ghi-critical font-bold mb-3 relative z-10 line-clamp-2">
          {syncError || status?.last_sync_error}
        </div>
      )}

      {/* Sync button */}
      <button
        onClick={triggerSync}
        disabled={!status?.can_sync_now || syncing}
        className={`
          w-full py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider
          transition-all duration-300 relative z-10
          ${
            status?.can_sync_now && !syncing
              ? 'bg-ghi-teal/20 border border-ghi-teal/50 text-ghi-teal hover:bg-ghi-teal/30 hover:shadow-[0_0_12px_rgba(0,242,255,0.3)]'
              : 'bg-slate-800/50 border border-slate-700/50 text-slate-600 cursor-not-allowed'
          }
        `}
      >
        {syncing ? 'SYNCING...' : status?.is_active ? 'SYNC IN PROGRESS' : 'SYNC NOW'}
      </button>
    </div>
  );
}

const EscalationView = () => {
  return (
    <div className="space-y-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000 pb-12">
      <div className="glass-panel p-10 rounded-3xl border border-ghi-blue/10 text-center">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">No escalations pending</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          Escalated signals will appear here once an assessment is completed.
        </p>
      </div>
    </div>
  );
};

export default EscalationView;

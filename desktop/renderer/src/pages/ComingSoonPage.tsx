import React from 'react';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComingSoonPageProps {
  moduleName: string;
  description: string;
  plannedFeatures: string[];
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  moduleName,
  description,
  plannedFeatures,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Header card */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/60 p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <Clock className="h-7 w-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Step 1 Foundation Complete
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">{moduleName}</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {description}
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-surface-800 px-4 py-2 text-xs font-medium text-slate-200 border border-surface-700 hover:bg-surface-700 transition-all"
          >
            Back to Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Planned capabilities */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Planned Step 2+ Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plannedFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl bg-surface-950/60 border border-surface-800/80 p-3.5 text-xs text-slate-300"
            >
              <div className="h-2 w-2 rounded-full bg-brand-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

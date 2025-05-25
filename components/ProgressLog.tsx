
import React, { useEffect, useRef } from 'react';
// Fix: Changed LogEntry to UILogEntry as it's the correct type from types.ts for UI logs.
import type { UILogEntry } from '../types';

interface ProgressLogProps {
  entries: UILogEntry[];
}

const getLogTypeColor = (type: UILogEntry['type']) => {
  switch (type) {
    case 'error':
      return 'text-red-400';
    case 'success':
      return 'text-green-400';
    case 'system':
      return 'text-sky-400';
    case 'info':
    default:
      return 'text-slate-400';
  }
};

export const ProgressLog: React.FC<ProgressLogProps> = ({ entries }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-32 bg-slate-900/80 backdrop-blur-md border-t border-slate-700 shadow-2xl z-50"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div className="p-3 text-xs text-slate-300 overflow-y-auto h-full custom-scrollbar" ref={logContainerRef}>
        {entries.map(entry => (
          <div key={entry.id} className={`mb-1 ${getLogTypeColor(entry.type)}`}>
            <span className="font-mono mr-2">
              [{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
            </span>
            <span>{entry.message}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-slate-500">System log initialized. Actions will be logged here.</p>}
      </div>
    </div>
  );
};

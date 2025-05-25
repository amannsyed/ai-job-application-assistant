
import React from 'react';

interface FooterProps {
  children?: React.ReactNode;
}

export const Footer: React.FC<FooterProps> = ({ children }) => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700 py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} AI Job Application Assistant. Powered by Google Gemini.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Ensure all generated content is reviewed and accurately reflects your experience before submission.
        </p>
        {children && <div className="mt-3">{children}</div>} 
      </div>
    </footer>
  );
};

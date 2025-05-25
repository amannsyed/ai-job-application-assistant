
import React from 'react';
import type { OutputType, DocumentFormat, DocumentType } from '../types'; // Added DocumentType

interface GeneratedSectionProps {
  title: string;
  content: string;
  onDownload: (type: DocumentType, format: DocumentFormat) => void; // Changed OutputType to DocumentType
  type: OutputType; // This is the DocumentType
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);


export const GeneratedSection: React.FC<GeneratedSectionProps> = ({ title, content, onDownload, type }) => {
  // Replace '---' with <hr /> for resume display, and handle bold markdown for display
  const renderContentWithBold = (text: string) => {
    // Basic bold handling for display. For proper HTML, more robust parsing might be needed.
    // This replaces **bold** with <strong>bold</strong>. It's simple and might break with nested or complex markdown.
    const htmlWithBold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return { __html: htmlWithBold.replace(/\n/g, '<br />') };
  };


  const formattedContent = type === 'resume' 
    ? content.split(/\n---\n/).map((section, index, arr) => (
        <React.Fragment key={index}>
          <div dangerouslySetInnerHTML={renderContentWithBold(section)} />
          {index < arr.length - 1 && <hr className="my-4 border-slate-600" />}
        </React.Fragment>
      ))
    : <div dangerouslySetInnerHTML={renderContentWithBold(content)} />;

  return (
    <div className="bg-slate-700/50 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-semibold text-sky-300">{title}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onDownload(type, 'docx')} // type is already DocumentType
            title={`Download ${title} as DOCX`}
            className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-md shadow-md transition-colors flex items-center"
          >
            <DownloadIcon className="w-4 h-4 mr-1.5" /> DOCX
          </button>
          <button
            onClick={() => onDownload(type, 'pdf')} // type is already DocumentType
            title={`Download ${title} as PDF`}
            className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-md shadow-md transition-colors flex items-center"
          >
           <DownloadIcon className="w-4 h-4 mr-1.5" /> PDF
          </button>
        </div>
      </div>
      <div className="prose prose-sm prose-invert max-w-none bg-slate-800 p-4 rounded-md max-h-96 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed text-slate-300">
        {formattedContent}
      </div>
    </div>
  );
};

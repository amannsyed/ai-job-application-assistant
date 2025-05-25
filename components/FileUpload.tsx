
import React, { useCallback, useState } from 'react';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } from '../constants';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  currentFile: File | null;
  parsedText: string;
}

const acceptedFileTypesString = Object.values(ALLOWED_FILE_TYPES).flat().join(',');

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, currentFile, parsedText }) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileValidation = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      setFileError(`Invalid file type. Please upload: ${acceptedFileTypesString}`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    setFileError(null);
    return true;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && handleFileValidation(file)) {
      onFileChange(file);
    } else if (!file) {
      onFileChange(null); // Clear if no file selected
    }
     // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && handleFileValidation(file)) {
      onFileChange(file);
    }
  }, [onFileChange]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const handleRemoveFile = () => {
    onFileChange(null);
    setFileError(null);
  };

  return (
    <div>
      <label htmlFor="resumeUpload" className="block text-sm font-medium text-sky-300 mb-1">Upload Resume</label>
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${dragOver ? 'border-sky-500 bg-slate-700' : 'border-slate-600 border-dashed'} rounded-md transition-colors duration-150`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-1 text-center">
          <svg className={`mx-auto h-12 w-12 ${currentFile ? 'text-green-400' : 'text-slate-500'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {currentFile ? (
            <>
              <p className="text-sm text-slate-300">{currentFile.name} ({Math.round(currentFile.size / 1024)} KB)</p>
              {parsedText && <span className="text-xs text-green-400">(Parsed Successfully)</span>}
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Change file
              </button>
            </>
          ) : (
            <>
              <div className="flex text-sm text-slate-400">
                <label
                  htmlFor="file-upload-input"
                  className="relative cursor-pointer bg-slate-700 rounded-md font-medium text-sky-400 hover:text-sky-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-sky-500 px-1"
                >
                  <span>Upload a file</span>
                  <input id="file-upload-input" name="file-upload-input" type="file" className="sr-only" onChange={handleInputChange} accept={acceptedFileTypesString} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-slate-500">DOCX, PDF, TXT up to {MAX_FILE_SIZE_MB}MB</p>
            </>
          )}
        </div>
      </div>
      {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
    </div>
  );
};

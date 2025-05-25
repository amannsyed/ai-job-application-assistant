
export interface Question {
  id: string;
  text: string;
}

export interface GeneratedContent {
  coverLetter: string;
  resume: string;
  answers: string;
}

export type OutputType = 'coverLetter' | 'resume' | 'answers';
export type DocumentFormat = 'docx' | 'pdf';
export type DocumentType = OutputType; // For clarity in document generator

// This could be expanded if Gemini returns structured data,
// but for text output, it's simpler.
export interface GeminiResponse {
  text: () => string; // Method to get the text part of the response
}

// Define specific types for grounding metadata if you plan to use it explicitly
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // other types of chunks if applicable
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // other metadata fields
}

export interface Candidate {
  groundingMetadata?: GroundingMetadata;
  // other candidate fields
}

// For GoogleGenAI response type (simplified for text extraction and grounding)
export interface GenerateContentResponse {
  text: string; // Direct access to text
  candidates?: Candidate[];
  // other response fields
}

export interface UILogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success' | 'system';
}

// For detailed file logging
export interface FileLogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'DEBUG';
  module?: string;
  function?: string;
  message: string;
  details?: Record<string, any> | string;
}

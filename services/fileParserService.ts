
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { logger } from './loggingService';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  const pdfjsDistVersionInImportMap = "5.2.133"; 
  const workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsDistVersionInImportMap}/build/pdf.worker.mjs`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  logger.addLog('FileParserService', 'GlobalSetup', `PDF.js workerSrc set to: ${workerSrc}`);
}


export const parseFile = async (file: File): Promise<string> => {
  logger.addLog('FileParserService', 'parseFile', `Attempting to parse file: ${file.name}`, { type: file.type, size: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          const errorMsg = 'File reading failed, event.target.result is null.';
          logger.addLog('FileParserService', 'parseFile.onload', errorMsg, { fileName: file.name }, 'ERROR');
          throw new Error(errorMsg);
        }
        const arrayBuffer = event.target.result as ArrayBuffer;
        logger.addLog('FileParserService', 'parseFile.onload', `File read into ArrayBuffer successfully: ${file.name}`);

        let textContent = '';
        if (file.type === 'application/pdf') {
          logger.addLog('FileParserService', 'parseFile.onload', `Parsing PDF: ${file.name}`);
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          logger.addLog('FileParserService', 'parseFile.onload', `PDF document loaded, numPages: ${pdf.numPages}`);
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
          }
          textContent = textContent.trim();
          logger.addLog('FileParserService', 'parseFile.onload', `PDF parsed successfully: ${file.name}`);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          logger.addLog('FileParserService', 'parseFile.onload', `Parsing DOCX: ${file.name}`);
          const result = await mammoth.extractRawText({ arrayBuffer });
          textContent = result.value.trim();
          logger.addLog('FileParserService', 'parseFile.onload', `DOCX parsed successfully: ${file.name}`);
        } else if (file.type === 'text/plain') {
          logger.addLog('FileParserService', 'parseFile.onload', `Parsing TXT: ${file.name}`);
          textContent = new TextDecoder().decode(arrayBuffer).trim();
          logger.addLog('FileParserService', 'parseFile.onload', `TXT parsed successfully: ${file.name}`);
        } else {
          const errorMsg = `Unsupported file type: ${file.type}`;
          logger.addLog('FileParserService', 'parseFile.onload', errorMsg, { fileName: file.name }, 'ERROR');
          reject(new Error(errorMsg));
          return;
        }
        resolve(textContent);
      } catch (error) {
        const errorMsg = `Error processing file content: ${file.name}`;
        logger.addLog('FileParserService', 'parseFile.onload', errorMsg, { error: String(error) }, 'ERROR');
        console.error("Error processing file:", error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    reader.onerror = (errorEvent) => {
      const errorMsg = `FileReader error for file: ${file.name}`;
      // FileReader.error is a DOMException, not a standard Error object.
      // We don't have direct access to a message usually.
      logger.addLog('FileParserService', 'parseFile.onerror', errorMsg, { errorDetails: "See browser console for DOMException" }, 'ERROR');
      console.error("FileReader error:", errorEvent);
      reject(new Error('Error reading file. Check console for details.'));
    };
    
    reader.readAsArrayBuffer(file);
    logger.addLog('FileParserService', 'parseFile', `FileReader.readAsArrayBuffer called for ${file.name}`);
  });
};

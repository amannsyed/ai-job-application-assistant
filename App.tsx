
import React, { useState, useCallback, useEffect } from 'react';
import { parseFile } from './services/fileParserService';
import { generateContentWithGemini } from './services/geminiService';
import { downloadDocx, downloadPdf } from './services/documentGeneratorService';
import type { Question, OutputType, UILogEntry, DocumentType, DocumentFormat } from './types';
import { FileUpload } from './components/FileUpload';
import { QuestionInputGroup } from './components/QuestionInputGroup';
import { GeneratedSection } from './components/GeneratedSection';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Button } from './components/Button';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProgressLog } from './components/ProgressLog';
import { INITIAL_QUESTIONS, PROMPT_TEMPLATES } from './constants';
import { logger } from './services/loggingService'; // Import the logger

const sanitizeForFilename = (name: string | null): string | null => {
    if (!name) return null;
    // Allow alphanumeric, underscore, dot, hyphen. Replace other problem chars.
    return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, '');
};

const parsePrefixData = (text: string, prefix: string): { value: string | null, cleanedText: string } => {
    const regex = new RegExp(`^${prefix}:\\s*(.+)\\n`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
        const value = match[1].trim();
        return {
            value: value.toUpperCase() === "N/A" ? null : value, // Treat "N/A" (case-insensitive) as null
            cleanedText: text.replace(regex, '')
        };
    }
    return { value: null, cleanedText: text };
};


const App: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>('');
  const [generatedResume, setGeneratedResume] = useState<string>('');
  const [generatedAnswers, setGeneratedAnswers] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [uiLogEntries, setUiLogEntries] = useState<UILogEntry[]>([]);

  const [finalApplicantName, setFinalApplicantName] = useState<string>("Applicant");
  const [finalCompanyName, setFinalCompanyName] = useState<string>("");


  const addUILogEntry = useCallback((message: string, type: UILogEntry['type'] = 'info') => {
    setUiLogEntries(prev => {
      const newEntry = { id: Date.now().toString(), timestamp: new Date(), message, type };
      return [...prev, newEntry].slice(-50); // Keep UI log concise
    });
    const logLevel = type === 'error' ? 'ERROR' : 'INFO';
    if (type !== 'system') { 
        logger.addLog('App.UI', 'addUILogEntry', message, undefined, logLevel);
    }
  }, []);

  useEffect(() => {
    addUILogEntry("Application initialized. Logs are stored locally and persist across sessions.", "system");
    logger.addLog('App', 'useEffect[]', 'Application component mounted. Historical logs loaded if available.');
  }, [addUILogEntry]);

  const handleFileChange = useCallback(async (file: File | null) => {
    logger.addLog('App', 'handleFileChange', file ? `File selected: ${file.name}` : 'File selection cleared.');
    setResumeFile(file);
    setError(null);
    setFinalApplicantName("Applicant"); // Reset names on new file
    setFinalCompanyName("");
    if (file) {
      const task = `Parsing resume: ${file.name}`;
      setCurrentTask(task);
      addUILogEntry(task, 'info');
      setIsLoading(true);
      try {
        const text = await parseFile(file);
        setResumeText(text);
        addUILogEntry(`Resume "${file.name}" parsed successfully.`, 'success');
        logger.addLog('App', 'handleFileChange', `Resume parsed successfully: ${file.name}`, { fileSize: file.size, fileType: file.type });
      } catch (e) {
        const errorMsg = `Failed to parse resume: ${e instanceof Error ? e.message : String(e)}`;
        console.error("Failed to parse file:", e);
        setError(errorMsg);
        addUILogEntry(errorMsg, 'error');
        logger.addLog('App', 'handleFileChange', `Error parsing resume: ${file.name}`, { error: String(e) }, 'ERROR');
        setResumeText('');
      } finally {
        setIsLoading(false);
        setCurrentTask('');
      }
    } else {
      setResumeText('');
      addUILogEntry("Resume file selection cleared.", 'info');
    }
  }, [addUILogEntry]);

  const handleGenerate = useCallback(async () => {
    logger.addLog('App', 'handleGenerate', 'Generate button clicked.');
    if (!resumeText) {
      const msg = 'Please upload and parse a resume.';
      setError(msg);
      addUILogEntry(msg, 'error');
      logger.addLog('App', 'handleGenerate', 'Validation failed: Resume text missing.', undefined, 'ERROR');
      return;
    }
    if (!jobDescription) {
      const msg = 'Please provide a job description.';
      setError(msg);
      addUILogEntry(msg, 'error');
      logger.addLog('App', 'handleGenerate', 'Validation failed: Job description missing.', undefined, 'ERROR');
      return;
    }
    setError(null);
    setIsLoading(true);
    addUILogEntry("Starting generation process...", 'system');
    logger.addLog('App', 'handleGenerate', 'Starting content generation process.');
    
    // Reset names at the start of each generation cycle
    let localApplicantName: string | null = null;
    let localCompanyName: string | null = null;
    let cleanedResumeOutput: string = '';
    let cleanedCoverLetterOutput: string = '';
    let generatedAnswersOutput: string = '';


    const generationTasks = [];

    // Cover Letter Generation
    generationTasks.push(async () => {
      setCurrentTask('Generating Cover Letter...');
      addUILogEntry('Generating Cover Letter...', 'info');
      logger.addLog('App', 'handleGenerate.coverLetter', 'Initiating cover letter generation.');
      
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const coverLetterPrompt = PROMPT_TEMPLATES.coverLetter
        .replace('{resumeText}', resumeText)
        .replace('{jobDescription}', jobDescription)
        .replace('{currentDate}', currentDate);
      
      const rawCoverLetterResponse = await generateContentWithGemini(coverLetterPrompt, true, 'Cover Letter');
      let tempText = rawCoverLetterResponse;
      const companyData = parsePrefixData(tempText, "COMPANY_NAME");
      // If company name wasn't found from resume (or resume task hasn't set it yet), use this one.
      if (!localCompanyName && companyData.value) { 
          localCompanyName = companyData.value;
      }
      tempText = companyData.cleanedText;
      cleanedCoverLetterOutput = tempText.trim();
      addUILogEntry('Cover Letter generated successfully.', 'success');
      logger.addLog('App', 'handleGenerate.coverLetter', 'Cover letter generated successfully.');
    });

    // Improved Resume Generation
    generationTasks.push(async () => {
      setCurrentTask('Generating Improved Resume...');
      addUILogEntry('Generating Improved Resume...', 'info');
      logger.addLog('App', 'handleGenerate.resume', 'Initiating improved resume generation.');
      const resumePrompt = PROMPT_TEMPLATES.resume
        .replace('{resumeText}', resumeText)
        .replace('{jobDescription}', jobDescription);
      
      const rawResumeResponse = await generateContentWithGemini(resumePrompt, true, 'Improved Resume');
      let tempText = rawResumeResponse;
      
      const applicantData = parsePrefixData(tempText, "APPLICANT_NAME");
      if (applicantData.value) localApplicantName = applicantData.value;
      tempText = applicantData.cleanedText;

      const companyData = parsePrefixData(tempText, "COMPANY_NAME");
      // Resume's company name takes precedence if found
      if (companyData.value) localCompanyName = companyData.value; 
      tempText = companyData.cleanedText;
      
      cleanedResumeOutput = tempText.trim();
      addUILogEntry('Improved Resume generated successfully.', 'success');
      logger.addLog('App', 'handleGenerate.resume', 'Improved resume generated successfully.');
    });

    // Answers Generation (if questions provided)
    if (questions.some(q => q.text.trim() !== '')) {
      generationTasks.push(async () => {
        setCurrentTask('Generating Answers to Questions...');
        addUILogEntry('Generating Answers to Questions...', 'info');
        logger.addLog('App', 'handleGenerate.answers', 'Initiating answers generation.');
        const questionsText = questions.filter(q => q.text.trim() !== '').map((q, i) => `${i + 1}. ${q.text}`).join('\n');
        const answersPrompt = PROMPT_TEMPLATES.questions
          .replace('{resumeText}', resumeText)
          .replace('{jobDescription}', jobDescription)
          .replace('{questionsList}', questionsText);
        generatedAnswersOutput = await generateContentWithGemini(answersPrompt, true, 'Answers');
        addUILogEntry('Answers to questions generated successfully.', 'success');
        logger.addLog('App', 'handleGenerate.answers', 'Answers generated successfully.');
      });
    } else {
        generatedAnswersOutput = '';
        addUILogEntry('No optional questions provided; skipping answer generation.', 'info');
        logger.addLog('App', 'handleGenerate.answers', 'Skipping answer generation as no questions provided.');
    }
    
    try {
        await Promise.all(generationTasks.map(task => task()));
        
        setFinalApplicantName(sanitizeForFilename(localApplicantName) || "Applicant");
        setFinalCompanyName(sanitizeForFilename(localCompanyName) || "");

        setGeneratedCoverLetter(cleanedCoverLetterOutput);
        setGeneratedResume(cleanedResumeOutput);
        setGeneratedAnswers(generatedAnswersOutput);

        addUILogEntry("All materials generated successfully.", 'system');
        logger.addLog('App', 'handleGenerate', 'All materials generated successfully.', {
            applicantName: localApplicantName || "N/A",
            companyName: localCompanyName || "N/A"
        });

    } catch (e) {
      const errorMsg = `Generation failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error("Failed to generate content:", e);
      setError(errorMsg);
      addUILogEntry(errorMsg, 'error');
      logger.addLog('App', 'handleGenerate', 'Content generation failed.', { error: String(e) }, 'ERROR');
      setGeneratedCoverLetter('');
      setGeneratedResume('');
      setGeneratedAnswers('');
    } finally {
      setIsLoading(false);
      setCurrentTask('');
    }
  }, [resumeText, jobDescription, questions, addUILogEntry]);

  const handleDownload = (type: DocumentType, format: DocumentFormat) => {
    let content = '';
    let fileName = '';
    let friendlyName = '';

    const applicantPart = finalApplicantName || "Applicant"; // Fallback, should be set
    const companyPart = finalCompanyName; // Empty if not found

    logger.addLog('App', 'handleDownload', `Download triggered for type: ${type}, format: ${format}.`, { applicantPart, companyPart });

    if (type === 'coverLetter') {
      content = generatedCoverLetter;
      friendlyName = 'Cover Letter';
      fileName = companyPart 
        ? `${companyPart}_${applicantPart}_Cover_Letter.${format}` 
        : `${applicantPart}_Cover_Letter.${format}`;
      if (!companyPart && applicantPart === "Applicant") fileName = `Cover_Letter.${format}`; // Fully generic if no names
    } else if (type === 'resume') {
      content = generatedResume;
      friendlyName = 'Improved Resume';
      fileName = companyPart 
        ? `${companyPart}_${applicantPart}_Resume.${format}`
        : `${applicantPart}_Resume.${format}`;
      if (!companyPart && applicantPart === "Applicant") fileName = `Improved_Resume.${format}`;
    } else if (type === 'answers') {
        content = generatedAnswers;
        friendlyName = 'Job Application Answers';
        fileName = companyPart
        ? `${companyPart}_${applicantPart}_Answers.${format}`
        : `${applicantPart}_Answers.${format}`;
      if (!companyPart && applicantPart === "Applicant") fileName = `Job_Application_Answers.${format}`;
    }


    if (!content) {
      const msg = `No content to download for ${friendlyName}.`;
      setError(msg);
      addUILogEntry(msg, 'error');
      logger.addLog('App', 'handleDownload', `No content for ${friendlyName}. Download aborted.`, undefined, 'ERROR');
      return;
    }
    
    const task = `Preparing ${friendlyName} for ${format.toUpperCase()} download...`;
    addUILogEntry(task, 'info');
    setCurrentTask(task);
    setIsLoading(true);
    logger.addLog('App', 'handleDownload', task);

    setTimeout(async () => { 
        try {
          if (format === 'docx') {
            await downloadDocx(content, fileName, type); 
          } else {
            await downloadPdf(content, fileName, type); 
          }
          addUILogEntry(`${friendlyName} (${format.toUpperCase()}) download initiated: ${fileName}`, 'success');
          logger.addLog('App', 'handleDownload', `${friendlyName} (${format.toUpperCase()}) download initiated successfully: ${fileName}`);
        } catch (e) {
            const errorMsg = `Failed to download ${friendlyName} as ${format.toUpperCase()}: ${e instanceof Error ? e.message : String(e)}`;
            console.error(errorMsg, e);
            setError(errorMsg);
            addUILogEntry(errorMsg, 'error');
            logger.addLog('App', 'handleDownload', `Failed to download ${friendlyName} as ${format.toUpperCase()}`, { error: String(e), fileNameInput: fileName }, 'ERROR');
        } finally {
            setIsLoading(false);
            setCurrentTask('');
        }
    }, 100);
  };
  
  const handleDownloadLogFile = () => {
    logger.downloadLogFile(); // Downloads all accumulated logs
    addUILogEntry('Full application activity log download initiated.', 'system');
  };

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all persisted activity logs? This action cannot be undone.")) {
      logger.clearAllLogs();
      addUILogEntry('All activity logs have been cleared from local storage.', 'system');
    }
  };

  const canGenerate = resumeText && jobDescription.trim() !== '';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-slate-100 pb-32">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <section className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8">
            <h2 className="text-3xl font-semibold mb-6 text-sky-400 border-b border-slate-700 pb-3">Your Information</h2>
            <div className="space-y-6">
              <FileUpload onFileChange={handleFileChange} currentFile={resumeFile} parsedText={resumeText}/>
              <div>
                <label htmlFor="jobDescription" className="block text-sm font-medium text-sky-300 mb-1">Job Description</label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => { 
                    setJobDescription(e.target.value); 
                    setError(null);
                    logger.addLog('App.UI', 'jobDescriptionChange', 'Job description changed.');
                  }}
                  rows={8}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-200 placeholder-slate-400 text-sm resize-y"
                  placeholder="Paste the full job description here..."
                />
              </div>
              <QuestionInputGroup questions={questions} setQuestions={setQuestions} />
            </div>
          </section>

          <div className="text-center">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !canGenerate}
              className="px-12 py-4 text-lg font-semibold"
            >
              {isLoading && currentTask ? <LoadingSpinner text={currentTask} /> : '✨ Generate Application Materials ✨'}
            </Button>
            {error && <p className="text-red-400 mt-4 text-sm px-4 py-2 bg-red-900/30 rounded-md">{error}</p>}
          </div>

          {(generatedCoverLetter || generatedResume || generatedAnswers) && !isLoading && (
            <section className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8 mt-8">
              <h2 className="text-3xl font-semibold mb-6 text-sky-400 border-b border-slate-700 pb-3">Generated Materials</h2>
              <div className="space-y-8">
                {generatedCoverLetter && (
                  <GeneratedSection title="Cover Letter" content={generatedCoverLetter} onDownload={handleDownload} type="coverLetter" />
                )}
                {generatedResume && (
                  <GeneratedSection title="Improved Resume" content={generatedResume} onDownload={handleDownload} type="resume" />
                )}
                {generatedAnswers && (
                  <GeneratedSection title="Answers to Questions" content={generatedAnswers} onDownload={handleDownload} type="answers" />
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer>
        <div className="flex flex-col items-center space-y-1 md:flex-row md:justify-center md:space-y-0 md:space-x-4">
            <button 
              onClick={handleDownloadLogFile} 
              className="text-xs text-sky-400 hover:text-sky-300 underline"
              title="Download detailed application activity log"
            >
              Download Activity Log
            </button>
            <button 
              onClick={handleClearLogs} 
              className="text-xs text-rose-400 hover:text-rose-300 underline"
              title="Clear all persisted application activity logs"
            >
              Clear All Activity Logs
            </button>
        </div>
      </Footer>
      <ProgressLog entries={uiLogEntries} />
    </div>
  );
};

export default App;

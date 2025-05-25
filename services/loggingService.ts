import type { FileLogEntry } from '../types';
import { LOCAL_STORAGE_LOG_KEY } from '../constants';

class LoggingService {
  private logEntries: FileLogEntry[] = [];
  private static instance: LoggingService;

  private constructor() {
    this.loadLogsFromLocalStorage();
    this.addLog('LoggingService', 'constructor', 'Logging service initialized and historical logs loaded.', { loadedCount: this.logEntries.length });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private loadLogsFromLocalStorage(): void {
    try {
      const storedLogs = localStorage.getItem(LOCAL_STORAGE_LOG_KEY);
      if (storedLogs) {
        this.logEntries = JSON.parse(storedLogs);
        if (!Array.isArray(this.logEntries)) { // Basic validation
            this.logEntries = [];
            console.warn("Stored logs were not an array, resetting.");
        }
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
      this.logEntries = []; // Start fresh if loading fails
    }
  }

  private saveLogsToLocalStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOG_KEY, JSON.stringify(this.logEntries));
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
      // Potentially handle quota exceeded error more gracefully if needed
      this.addLog('LoggingService', 'saveLogsToLocalStorage', 'Error saving logs to localStorage.', { error: String(error) }, 'ERROR');
    }
  }

  public addLog(
    module: string,
    functionName: string,
    message: string,
    details?: Record<string, any> | string,
    level: FileLogEntry['level'] = 'INFO'
  ): void {
    const timestamp = new Date().toISOString();
    const entry: FileLogEntry = {
      timestamp,
      level,
      module,
      function: functionName,
      message,
      details,
    };
    this.logEntries.push(entry);
    this.saveLogsToLocalStorage(); // Save after each new log
  }

  public getLogs(): FileLogEntry[] {
    // Returns a copy to prevent external modification of the internal array.
    // The internal array is now the single source of truth, loaded from and saved to localStorage.
    return [...this.logEntries];
  }

  public formatLogsAsText(): string {
    // Uses the current state of logEntries, which includes historical logs
    return this.logEntries
      .map(entry => {
        let detailStr = '';
        if (entry.details) {
          if (typeof entry.details === 'string') {
            detailStr = ` | Details: ${entry.details}`;
          } else {
            try {
              // Sort keys for consistent output if details is an object
              const sortedDetails = Object.keys(entry.details).sort().reduce((obj, key) => {
                obj[key] = entry.details![key];
                return obj;
              }, {} as Record<string, any>);
              detailStr = ` | Details: ${JSON.stringify(sortedDetails)}`;
            } catch (e) {
              detailStr = ` | Details: (Unserializable)`;
            }
          }
        }
        return `[${entry.timestamp}] [${entry.level}] ${entry.module || 'App'}${entry.function ? '.' + entry.function : ''} - ${entry.message}${detailStr}`;
      })
      .join('\n');
  }

  public downloadLogFile(fileName: string = 'activity_logs.log'): void {
    this.addLog('LoggingService', 'downloadLogFile', `Attempting to download all accumulated logs to ${fileName}. Log count: ${this.logEntries.length}`);
    const logText = this.formatLogsAsText();
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' }); // Corrected charset
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    this.addLog('LoggingService', 'downloadLogFile', `Log file ${fileName} download initiated with ${this.logEntries.length} entries.`);
  }

  public clearAllLogs(): void {
    this.logEntries = [];
    try {
      localStorage.removeItem(LOCAL_STORAGE_LOG_KEY);
      this.addLog('LoggingService', 'clearAllLogs', 'All log entries cleared from memory and localStorage.');
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error);
      this.addLog('LoggingService', 'clearAllLogs', 'Cleared logs from memory, but error removing from localStorage.', { error: String(error) }, 'ERROR');
    }
  }
}

export const logger = LoggingService.getInstance();
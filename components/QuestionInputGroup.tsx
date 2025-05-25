
import React from 'react';
import type { Question } from '../types';

interface QuestionInputGroupProps {
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
}

export const QuestionInputGroup: React.FC<QuestionInputGroupProps> = ({ questions, setQuestions }) => {
  const addQuestion = () => {
    setQuestions([...questions, { id: `q${Date.now()}`, text: '' }]);
  };

  const updateQuestion = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-sky-300">Optional: Job Application Questions</label>
        <button
          type="button"
          onClick={addQuestion}
          className="text-sm text-sky-400 hover:text-sky-300 font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Question
        </button>
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={question.id} className="flex items-center space-x-2">
            <input
              type="text"
              value={question.text}
              onChange={(e) => updateQuestion(question.id, e.target.value)}
              placeholder={`Question ${index + 1}... (e.g., Why are you interested in this role?)`}
              className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-200 placeholder-slate-400 text-sm"
            />
            {questions.length > 0 && ( // Show remove button only if there's at least one question
              <button
                type="button"
                onClick={() => removeQuestion(question.id)}
                className="p-2 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                aria-label="Remove question"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ))}
         {questions.length === 0 && (
            <p className="text-xs text-slate-500">Click 'Add Question' to include specific questions for the AI to answer.</p>
        )}
      </div>
    </div>
  );
};

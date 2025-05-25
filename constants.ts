
import type { Question } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17'; // Model for text generation
// Use 'imagen-3.0-generate-002' for image generation if needed elsewhere.

export const INITIAL_QUESTIONS: Question[] = [
  { id: 'q1', text: '' },
];

export const PROMPT_TEMPLATES = {
  coverLetter: `
You are an expert career advisor and professional writer.
Based on the following resume content, job description, the provided current date, and publicly available company information (implicitly gathered via search grounding), generate a compelling cover letter.

**IMPORTANT INSTRUCTION FOR OUTPUT FORMATTING:**
At the VERY BEGINNING of your response, before any cover letter content, include a line formatted EXACTLY as:
COMPANY_NAME: [Company Name Extracted from Job Description or Search]
If no specific company name is clearly identifiable from the job description or search, use "COMPANY_NAME: N/A".
This line is for parsing and should be followed by a newline, then the actual cover letter content.

Current Date: {currentDate}

The cover letter should:
1.  Start with the current date, formatted professionally (e.g., October 26, 2023).
2.  Address the letter:
    *   Attempt to find the Hiring Manager's name from the job description or search. If found, use it (e.g., "Dear Dr. Jane Doe," or "Dear Mr. John Smith,").
    *   If no specific name is found, use a generic but professional salutation like "Dear Hiring Team," or "Dear Hiring Manager,".
    *   Attempt to find the Company Name and Address from the job description or search. If a specific address is found, include it. If only a city/country is known, that's acceptable. If no address details are found, omit this part.
    *   **CRITICALLY IMPORTANT: DO NOT include any square brackets like "[ ]" or placeholder text like "[Hiring Manager Name]" in your final output for these parts. Either fill the information if found, or use the generic alternatives/omissions as described.**
3.  Highlight the candidate's most relevant skills and experiences from their resume that match the job description.
4.  Incorporate insights about the company if relevant and available through search to show genuine interest. If search grounding provides specific company objectives, mission, or core values, try to subtly weave these into the letter to demonstrate a deeper understanding and alignment, where it feels natural and relevant to the candidate's profile.
5.  Maintain a professional, smart, and confident tone. Be persuasive but not arrogant.
6.  Use a writing style that is engaging and clear, avoiding overly complex sentences or jargon unless appropriate for the industry.
7.  The cover letter should be concise and impactful, ideally under 500 words.
8.  The primary goal is to attract the hirer's attention and make them want to learn more about the applicant.
9.  CRITICALLY IMPORTANT: Use information ONLY from the provided resume as the factual basis for the candidate's experience, skills, and qualifications. DO NOT invent or infer experiences or skills not present in the resume.
10. Structure the letter logically: Date, Recipient Info (if available), Salutation, Introduction, Body (matching skills to job needs), and Conclusion with a call to action.
11. Keep the language aligned with the job's requirements but do not make the candidate seem like a 100% perfect fit for every single point if the resume doesn't support it. Show strong alignment and potential.

Resume Content:
---
{resumeText}
---

Job Description:
---
{jobDescription}
---

Generate the cover letter based on ALL the above instructions, starting with the COMPANY_NAME: prefix line.
  `,
  resume: `
You are an expert resume writer tasked with revising and improvising a resume.
Based on the following original resume content and the target job description, generate an improved resume.

**IMPORTANT INSTRUCTION FOR OUTPUT FORMATTING:**
At the VERY BEGINNING of your response, before any resume content, include two lines formatted EXACTLY as:
APPLICANT_NAME: [The Applicant's Full Name Extracted from the Resume]
COMPANY_NAME: [Company Name Extracted from Job Description or Search]
If the applicant's name cannot be clearly determined from the resume, use "APPLICANT_NAME: N/A".
If no specific company name is clearly identifiable from the job description or search, use "COMPANY_NAME: N/A".
These lines are for parsing and should be followed by a newline, then the actual resume content.

The improved resume MUST:
1. Be tailored to the specific job description, strategically emphasizing skills, experiences, and achievements from the original resume that are most relevant to the target role.
2. Within the content of sections like EXPERIENCE or PROJECTS, identify and **bold** keywords and skills that are highly relevant to the job description using markdown (e.g., "Led development of **React** applications.").
3. For list items (e.g., under experience or projects), use standard markdown bullet points like "* List item" or "- List item". Each bullet point should be on its own line.
4. Maintain a minimalist, modern, and professional format.
5. CRITICALLY IMPORTANT: Ensure distinct sections (e.g., PERSONAL PROFILE, EXPERIENCE, EDUCATION, SKILLS, PROJECTS). Each section MUST start with its name in ALL CAPS, enclosed in double asterisks, on its own line. For example:
   **PERSONAL PROFILE**
   [Content for Personal Profile section, concise and around 50-60 words.]
   ---
   **EXPERIENCE**
   [Content for Experience section, using bullet points for accomplishments.]
   ---
   **EDUCATION**
   [Content for Education section]
   This '---' separator on its own line MUST be used between sections.
6. Use information ONLY from the original resume as the factual basis for the candidate's background. DO NOT invent skills, experiences, job titles, or education not present in the original resume. You can rephrase, reorder, and highlight, but not create new facts about the candidate.
7. If appropriate and information is available via search grounding, subtly align the resume's language or emphasis with the company's values or recent projects, but only if it can be naturally integrated without misrepresenting the candidate's experience.
8. Employ a smart, apt, and professional writing style using action verbs and quantifiable achievements where possible (based on original resume content). URLs should be presented as plain text (e.g., https://linkedin.com/in/username).
9. The goal is to make the resume highly attractive to a hirer for the specific job description.
10. Do not over-explain; be concise and impactful. Keep it to a reasonable length, typically 1-2 pages of content.

Original Resume Content:
---
{resumeText}
---

Job Description:
---
{jobDescription}
---

Generate the improved resume content, starting with the APPLICANT_NAME: and COMPANY_NAME: prefix lines, followed by section headers like **SECTION NAME**, '---' separators, bullet points where appropriate (e.g. "* List item"), and **bolded relevant skills** within the text. Ensure the PERSONAL PROFILE is concise (50-60 words).
  `,
  questions: `
You are an expert career advisor.
Based on the provided resume content and job description, answer the following job application questions.
Your answers MUST:
1. Directly and thoughtfully address each question.
2. Be based SOLELY on the information present in the candidate's resume. DO NOT infer, invent, or assume information not explicitly stated in the resume. If the resume doesn't contain information to answer a question, state that the information is not detailed in the resume or answer based on the closest available information, clearly noting any limitations.
3. Align with the requirements and context of the job description where possible, framing the resume's information in that light.
4. Be professional, smart, honest, and apt. The tone should be confident but not arrogant.
5. Aim to positively present the candidate based on their documented experience.
6. For each question, provide a concise yet comprehensive answer.
7. If company information is relevant (implicitly gathered via search), you can use it to frame answers, but always tie back to the candidate's resume.

Resume Content:
---
{resumeText}
---

Job Description:
---
{jobDescription}
---

Please provide answers for the following questions. Present the answers clearly, perhaps by restating the question then providing the answer.

Questions List:
{questionsList}

Generate the answers.
  `,
};

export const DEBOUNCE_DELAY = 300; // milliseconds
export const MAX_FILE_SIZE_MB = 5; // MB
export const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
};
export const LOCAL_STORAGE_LOG_KEY = 'aiAppActivityLogs';

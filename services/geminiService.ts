
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse as GeminiInternalResponse } from '@google/genai';
import { GEMINI_MODEL_TEXT } from '../constants';
import { logger } from './loggingService'; // Import the logger

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  const errorMsg = "API_KEY for Gemini is not set. Please set the environment variable.";
  console.error(errorMsg);
  logger.addLog('GeminiService', 'GlobalSetup', errorMsg, undefined, 'ERROR');
} else {
  logger.addLog('GeminiService', 'GlobalSetup', 'Gemini API_KEY found in environment.');
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY_FALLBACK" }); // Fallback to prevent crash if key is missing but still log

export const generateContentWithGemini = async (prompt: string, useSearchGrounding: boolean = false, promptType: string = "Generic"): Promise<string> => {
  logger.addLog('GeminiService', 'generateContentWithGemini', `Requesting content generation. Type: ${promptType}`, { useSearchGrounding, promptLength: prompt.length });

  if (!API_KEY) {
    const errorMsg = "Gemini API Key is not configured. Cannot make API calls.";
    logger.addLog('GeminiService', 'generateContentWithGemini', errorMsg, undefined, 'ERROR');
    throw new Error(errorMsg);
  }

  try {
    const modelConfig: any = {
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{text: prompt}] }], 
      config: {
        temperature: 0.6, 
        topP: 0.9,
        topK: 40,
      }
    };

    if (useSearchGrounding) {
      modelConfig.config.tools = [{ googleSearch: {} }];
      logger.addLog('GeminiService', 'generateContentWithGemini', 'Search grounding enabled for this request.');
    }
    
    const startTime = Date.now();
    const response: GeminiInternalResponse = await ai.models.generateContent(modelConfig);
    const duration = Date.now() - startTime;
    logger.addLog('GeminiService', 'generateContentWithGemini', `Gemini API response received. Type: ${promptType}. Duration: ${duration}ms.`);
    
    let generatedText = response.text; 

    if (useSearchGrounding && response.candidates && response.candidates.length > 0) {
      const candidateWithMetadata = response.candidates.find(c => c.groundingMetadata && c.groundingMetadata.groundingChunks && c.groundingMetadata.groundingChunks.length > 0);
      if (candidateWithMetadata?.groundingMetadata?.groundingChunks) {
        const sources = candidateWithMetadata.groundingMetadata.groundingChunks
          .filter(chunk => chunk.web && chunk.web.uri)
          .map(chunk => ({ title: chunk.web?.title || 'Untitled Source', uri: chunk.web?.uri }));
        
        if (sources.length > 0) {
          logger.addLog('GeminiService', 'generateContentWithGemini', `Search grounding sources found for prompt type: ${promptType}.`, { sources });
          // Removed appending sources to generatedText. They are now just logged.
        } else {
          logger.addLog('GeminiService', 'generateContentWithGemini', `Search grounding was enabled, but no web sources were found in the response for prompt type: ${promptType}.`);
        }
      } else {
         logger.addLog('GeminiService', 'generateContentWithGemini', `Search grounding was enabled, but no grounding metadata or chunks were found in the response for prompt type: ${promptType}.`);
      }
    }
    
    logger.addLog('GeminiService', 'generateContentWithGemini', `Successfully generated content. Type: ${promptType}. Output length: ${generatedText.length}`);
    return generatedText;

  } catch (error) {
    const errorMsgBase = `Error calling Gemini API for prompt type: ${promptType}.`;
    logger.addLog('GeminiService', 'generateContentWithGemini', errorMsgBase, { error: String(error) }, 'ERROR');
    console.error('Error calling Gemini API:', error);

    if (error instanceof Error) {
        const googleError = error as any; 
        if (googleError.message && googleError.message.includes('API key not valid')) {
             throw new Error('The provided API Key for Gemini is not valid. Please check your configuration.');
        }
         if (googleError.message && googleError.message.includes('permission')) {
             throw new Error('Gemini API request failed due to permission issues. Check API key permissions.');
        }
         throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the Gemini API.');
  }
};

// Stream function remains for reference but is not currently used with detailed logging added.
export async function* generateContentStream(prompt: string, useSearchGrounding: boolean = false, promptType: string = "GenericStream") {
  logger.addLog('GeminiService', 'generateContentStream', `Requesting streaming content generation. Type: ${promptType}`, { useSearchGrounding });
  if (!API_KEY) {
    const errorMsg = "Gemini API Key is not configured.";
    logger.addLog('GeminiService', 'generateContentStream', errorMsg, undefined, 'ERROR');
    throw new Error(errorMsg);
  }
  
  const modelConfig: any = {
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{text: prompt}] }],
      config: {
        temperature: 0.6,
        topP: 0.9,
        topK: 40,
      }
  };
  if (useSearchGrounding) {
    modelConfig.config.tools = [{ googleSearch: {} }];
    logger.addLog('GeminiService', 'generateContentStream', 'Search grounding enabled for stream.');
  }

  const stream = await ai.models.generateContentStream(modelConfig);
  let fullText = "";
  for await (const chunk of stream) {
    fullText += chunk.text;
    yield chunk.text;
  }
  logger.addLog('GeminiService', 'generateContentStream', `Streaming finished. Type: ${promptType}. Total length: ${fullText.length}`);
}

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Use a stable, generally-available Gemini model for all flows.
  // Updated from deprecated 1.5 model to a supported 2.5 Flash model.
  model: 'googleai/gemini-2.5-flash',
});

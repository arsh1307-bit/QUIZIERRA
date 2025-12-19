// Genkit integration disabled for frontend builds. All AI execution
// should run in the Python backend. This file exports a runtime stub
// that throws if used in the frontend to prevent accidental bundling
// of Genkit/LLM code into the React app.

function _disabled(...args: any[]) { // Accept any number of arguments
  throw new Error('Genkit AI flows are disabled in the frontend. Use the Python backend endpoints instead.');
}

export const ai = {
  defineFlow: _disabled,
  definePrompt: _disabled,
  define: _disabled,
  // provide a minimal object shape to avoid runtime import errors
};

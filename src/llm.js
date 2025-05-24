import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  vertexai: false,
  apiKey: "",
});
const model = 'gemini-2.5-flash-preview-05-20';

const generationConfig = {
    maxOutputTokens: 65535,
    temperature: 1,
    topP: 1,
    seed: 0,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'OFF',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'OFF',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'OFF',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'OFF',
      }
    ],
  };

  async function generateContent(prompt) {
    const req = {
      model: model,
      contents: [
        prompt,
      ],
      config: generationConfig,
    };
  
    const streamingResp = await ai.models.generateContentStream(req);
  
    for await (const chunk of streamingResp) {
      if (chunk.text) {
        return (chunk.text);
      } else {
        return (JSON.stringify(chunk) + '\n');
      }
    }
  }

    export default generateContent;
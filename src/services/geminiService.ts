import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface VideoOptions {
  duration: number; // 10-60
  style: string;
  mood: string;
  elements?: string;
  characterRef?: string;
  characterVoice?: string;
}

export interface VideoGenerationResult {
  done: boolean;
  videoUrl?: string;
  error?: string;
  operationId?: string;
}

export const geminiService = {
  /**
   * Refines a raw prompt into a cinematic description suitable for Sora-style generation.
   */
  async refinePrompt(prompt: string, options: VideoOptions): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Transform the following simple prompt into a highly detailed, cinematic, and descriptive prompt for a high-end AI video model. 
      
      Requirements:
      - Duration: ${options.duration} seconds.
      - Style: ${options.style}.
      - Mood: ${options.mood}.
      - Key Elements: ${options.elements || 'standard cinematic details'}.
      ${options.characterRef ? `- Character influence: Use the following character description/image reference which is already processed: ${options.characterRef}` : ''}
      ${options.characterVoice ? `- Voice influence: The character has a ${options.characterVoice} voice. Ensure the scene reflects a character that would speak this way.` : ''}
      
      Focus on lighting, camera work, texture, and technical cinematography.
      Keep the output as the descriptive prompt only.
      
      User Prompt: ${prompt}`,
    });
    return response.text || prompt;
  },

  /**
   * Initiates video generation using the Veo model.
   */
  async generateVideo(prompt: string, duration: number): Promise<any> {
    // Note: The Veo model might have its own limits, but we follow the user requirement for duration selection
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });
    return operation;
  },

  /**
   * Polls for completion of a video generation operation.
   */
  async checkOperation(operation: any): Promise<VideoGenerationResult> {
    if (operation.done) {
      const video = operation.response?.generatedVideos?.[0];
      if (video) {
        // The SDK returns video in a format we can use, typically base64 or a direct URL
        // For this implementation, we assume the response contains the video data
        const base64Data = video.videoBytes;
        const videoUrl = `data:video/mp4;base64,${base64Data}`;
        return { done: true, videoUrl };
      }
      return { done: true, error: "No video generated" };
    }
    return { done: false, operationId: operation.id };
  }
};

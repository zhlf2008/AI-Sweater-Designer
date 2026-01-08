import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const enhancePromptWithGemini = async (basePrompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Using a Flash model for speed
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位专业的时尚摄影师和AI绘画提示词专家。
      请优化以下毛衣设计提示词，加入高质量的艺术关键词、光影描述和材质细节，使其适合生成逼真的照片。
      请保持在80字以内。
      
      输入提示词: "${basePrompt}"
      
      要求：
      1. 请使用中文输出。
      2. 只输出优化后的提示词文本，不要包含任何其他解释或标签。`,
    });

    const text = response.text;
    return text ? text.trim() : basePrompt;

  } catch (error) {
    console.error("Failed to enhance prompt with Gemini:", error);
    return basePrompt;
  }
};

export const generateImageWithGemini = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    const ai = getClient();
    
    // Using Imagen model for high quality image generation
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio as any, 
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    
    if (imageBytes) {
      return `data:image/jpeg;base64,${imageBytes}`;
    }
    throw new Error("No image data returned");

  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
};
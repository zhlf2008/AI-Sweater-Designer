import { GoogleGenAI } from "@google/genai";
import { Config, Resolution } from "../types";

// Helper to get the effective API Key (User Input > Env Var)
const getApiKey = (config: Config) => {
  return config.userApiKey || process.env.API_KEY || "";
};

// --- Gemini Implementation ---

const getGeminiClient = (apiKey: string) => {
  if (!apiKey) throw new Error("API Key is missing. Please configure it in settings.");
  return new GoogleGenAI({ apiKey });
};

export const enhancePromptWithGemini = async (basePrompt: string, config: Config): Promise<string> => {
  try {
    const apiKey = getApiKey(config);
    // If using HF but wanting prompt enhancement, we still need a key. 
    // If no key provided for HF mode, we might skip enhancement or require key.
    if (!apiKey) return basePrompt; 

    const ai = getGeminiClient(apiKey);
    
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
    console.error("Failed to enhance prompt:", error);
    return basePrompt;
  }
};

const generateWithGemini = async (prompt: string, resolution: Resolution, apiKey: string): Promise<string> => {
    const ai = getGeminiClient(apiKey);
    
    // Map resolution to supported aspect ratios for Imagen
    let aspectRatio = "1:1";
    if (resolution.includes("3:4") || resolution === "864x1152") aspectRatio = "3:4";
    else if (resolution.includes("4:3") || resolution === "1152x864") aspectRatio = "4:3";
    else if (resolution.includes("16:9") || resolution === "1280x720") aspectRatio = "16:9";
    else if (resolution.includes("9:16") || resolution === "720x1280") aspectRatio = "9:16";

    // Fallback for unsupported ratios in Gemini to closest match
    
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
    throw new Error("No image data returned from Gemini");
};

// --- Hugging Face (Z-Image) Implementation ---

const generateWithHuggingFace = async (
  prompt: string, 
  resolution: string, 
  seed: number,
  config: Config
): Promise<string> => {
  // Using direct fetch to the Gradio Space API to avoid heavy dependencies in frontend
  // Space: Tongyi-MAI/Z-Image-Turbo
  
  // Format resolution string to match Z-Image expectation (e.g., "1024x1024 ( 1:1 )")
  // We need to match the resolution string exactly as the dropdown in the original tool
  // For simplicity, we construct a compatible string or find it in RESOLUTIONS
  
  // Note: The original tool sends "1024x1024 ( 1:1 )" with spaces. 
  // Our internal Resolution type is "1024x1024". We need to format it.
  const formatResForHF = (res: Resolution): string => {
     // Simple mapping or algorithmic formatting
     const map: Record<string, string> = {
         "1024x1024": "1024x1024 ( 1:1 )",
         "864x1152": "864x1152 ( 3:4 )",
         "1152x864": "1152x864 ( 4:3 )",
         "1248x832": "1248x832 ( 3:2 )",
         "832x1248": "832x1248 ( 2:3 )",
         "1280x720": "1280x720 ( 16:9 )",
         "720x1280": "720x1280 ( 9:16 )",
         "1344x576": "1344x576 ( 21:9 )",
         "576x1344": "576x1344 ( 9:21 )",
     };
     return map[res] || "1024x1024 ( 1:1 )";
  };

  const formattedRes = formatResForHF(resolution as Resolution);
  
  // Prepare payload based on aardio reference:
  // [prompt, resolution, seed, steps, timeShift, randomSeed, []]
  // Note: randomSeed boolean in API usually instructs backend to generate a seed, 
  // but here we manage seed in frontend, so we pass our specific seed and randomSeed=false effectively (or handle logic).
  // Actually, checking aardio code: if isRandom, it just sends the boolean true?
  // Re-reading aardio: `data = [prompt, res, seed, steps, timeShift, isRandom, []]`
  // We will manage seed explicitly for better control.
  
  const payload = {
    data: [
        prompt,
        formattedRes,
        seed,
        config.steps || 8,
        config.timeShift || 3.0,
        false, // We handle randomization in frontend by passing a random seed
        []
    ]
  };

  const headers: Record<string, string> = {
      "Content-Type": "application/json"
  };
  
  const apiKey = getApiKey(config);
  if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // We connect to the Gradio API endpoint
  const response = await fetch("https://tongyi-mai-z-image-turbo.hf.space/call/generate", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
  });

  if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HF API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const eventId = json.event_id;

  // Poll for result
  // Gradio /call/ endpoints return an event_id, then we poll /call/generate/{event_id}
  
  // Note: Direct REST to Gradio 4.x+ usually works this way, or via streaming.
  // The aardio code uses `gradioClient` which handles this via SSE or Websockets.
  // For simplicity in a pure browser fetch without client lib:
  
  const pollResult = async (id: string): Promise<string> => {
      let attempts = 0;
      while (attempts < 60) { // 60 seconds timeout
          const statusRes = await fetch(`https://tongyi-mai-z-image-turbo.hf.space/call/generate/${id}`, {
              headers: headers
          });
          
          if (!statusRes.ok) throw new Error("Polling failed");
          
          // The response is text/event-stream format usually, but simple GET might return JSON in some versions.
          // Let's try parsing as text lines (SSE).
          const text = await statusRes.text();
          const lines = text.split('\n');
          
          for (const line of lines) {
              if (line.startsWith('event: complete')) {
                   // Next line data
                   continue;
              }
              if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  try {
                      const data = JSON.parse(dataStr);
                      // Format: [ { image: { url: "..." }, ... }, seed, ... ]
                      if (Array.isArray(data) && data[0] && data[0].image) {
                          return data[0].image.url;
                      }
                  } catch (e) { /* ignore parse error */ }
              }
          }
          
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
      }
      throw new Error("Generation timed out");
  };

  return await pollResult(eventId);
};


// --- Unified Export ---

export const generateImage = async (
    prompt: string, 
    resolution: Resolution, 
    seed: number,
    config: Config
): Promise<string> => {
    const apiKey = getApiKey(config);
    
    if (config.apiProvider === 'huggingface') {
        return await generateWithHuggingFace(prompt, resolution, seed, config);
    } else {
        // Gemini
        if (!apiKey) throw new Error("Google Gemini API Key is missing.");
        return await generateWithGemini(prompt, resolution, apiKey);
    }
};
import { GoogleGenAI } from "@google/genai";
import { Config, Resolution } from "./types";

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
    if (config.apiProvider !== 'gemini') return basePrompt;
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
    
    let aspectRatio = "1:1";
    if (resolution.includes("3:4") || resolution === "864x1152") aspectRatio = "3:4";
    else if (resolution.includes("4:3") || resolution === "1152x864") aspectRatio = "4:3";
    else if (resolution.includes("16:9") || resolution === "1280x720") aspectRatio = "16:9";
    else if (resolution.includes("9:16") || resolution === "720x1280") aspectRatio = "9:16";

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
  const formatResForHF = (res: Resolution): string => {
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
  
  const payload = {
    data: [
        prompt,
        formattedRes,
        seed,
        config.steps || 8,
        config.timeShift || 3.0,
        false, 
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
  
  const pollResult = async (id: string): Promise<string> => {
      let attempts = 0;
      while (attempts < 60) { 
          const statusRes = await fetch(`https://tongyi-mai-z-image-turbo.hf.space/call/generate/${id}`, {
              headers: headers
          });
          
          if (!statusRes.ok) throw new Error("Polling failed");
          
          const text = await statusRes.text();
          const lines = text.split('\n');
          
          for (const line of lines) {
              if (line.startsWith('event: complete')) {
                   continue;
              }
              if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  try {
                      const data = JSON.parse(dataStr);
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

// --- ModelScope Implementation ---

const generateWithModelScope = async (
    prompt: string,
    resolution: Resolution,
    seed: number,
    config: Config
): Promise<string> => {
    const apiKey = getApiKey(config);
    if (!apiKey) throw new Error("ModelScope API Token is missing. Please configure it in Settings.");

    const proxy = config.corsProxy || "";
    const baseUrl = "https://api-inference.modelscope.cn/v1/images/generations";
    // Ensure URL is correctly formed with proxy
    const url = proxy ? `${proxy}${baseUrl}` : baseUrl;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "X-ModelScope-Async-Mode": "true",
                "X-ModelScope-Task-Type": "image_generation"
            },
            body: JSON.stringify({
                model: "Tongyi-MAI/Z-Image-Turbo",
                input: {
                    prompt: prompt
                },
                parameters: {
                    size: resolution,
                    n: 1,
                    seed: seed 
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ModelScope Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const taskId = data.task_id;
        if (!taskId) throw new Error("Failed to start ModelScope task: No task_id returned.");

        // Poll for status
        let attempts = 0;
        while (attempts < 60) {
            await new Promise(r => setTimeout(r, 2000));
            
            const taskBaseUrl = `https://api-inference.modelscope.cn/v1/tasks/${taskId}`;
            const taskUrl = proxy ? `${proxy}${taskBaseUrl}` : taskBaseUrl;

            const taskRes = await fetch(taskUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${apiKey}`
                }
            });

            if (!taskRes.ok) continue;

            const taskData = await taskRes.json();
            const status = taskData.task_status;

            if (status === 'SUCCEED' || status === 'SUCCEEDED') {
                 const outputImages = taskData.output_images;
                 if (outputImages && outputImages.length > 0) {
                     return outputImages[0];
                 }
                 throw new Error("Task succeeded but no images returned.");
            } else if (status === 'FAILED') {
                throw new Error(`ModelScope task failed: ${JSON.stringify(taskData)}`);
            } else if (status === 'CANCELED') {
                throw new Error("ModelScope task canceled.");
            }
            
            attempts++;
        }
        throw new Error("ModelScope generation timed out.");
    } catch (e: any) {
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
            throw new Error("ModelScope 连接被浏览器拦截 (CORS)。请在设置中配置 'CORS 代理' (如 https://corsproxy.io/?) 来解决此问题。");
        }
        throw e;
    }
};

export const generateImage = async (
    prompt: string, 
    resolution: Resolution, 
    seed: number,
    config: Config
): Promise<string> => {
    const apiKey = getApiKey(config);
    
    switch (config.apiProvider) {
        case 'huggingface':
            return await generateWithHuggingFace(prompt, resolution, seed, config);
        case 'modelscope':
            return await generateWithModelScope(prompt, resolution, seed, config);
        case 'gemini':
        default:
            if (!apiKey) throw new Error("Google Gemini API Key is missing.");
            return await generateWithGemini(prompt, resolution, apiKey);
    }
};
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Shuffle, 
  Download, 
  Wand2, 
  Loader2, 
  Palette, 
  Sparkles,
  Maximize2,
  AlertCircle,
  X
} from 'lucide-react';
import { Config, Resolution, GenerationState, Category } from './types';
import { DEFAULT_CONFIG, STATIC_PROMPT_SUFFIX, RESOLUTIONS } from './constants';
import ConfigModal from './components/ConfigModal';
import { enhancePromptWithGemini, generateImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>("1024x1024");
  const [seedInput, setSeedInput] = useState('42');
  const [isRandomSeed, setIsRandomSeed] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    imageUrl: null,
    seed: 42
  });

  // --- Helpers ---
  
  // Initialize selections with first items
  useEffect(() => {
    const initialSelections: Record<string, string> = {};
    config.categories.forEach(cat => {
      if (cat.items.length > 0 && !selections[cat.id]) {
        initialSelections[cat.id] = cat.items[0];
      }
    });
    // Only update if adding new keys to avoid overwriting user changes
    if (Object.keys(initialSelections).length > 0) {
      setSelections(prev => ({ ...prev, ...initialSelections }));
    }
  }, [config]);

  // Construct prompt when selections change
  const constructPrompt = useCallback(() => {
    const parts = ["AI设计：一件精美毛衣"];
    config.categories.forEach(cat => {
      if (selections[cat.id]) {
        parts.push(selections[cat.id]);
      }
    });
    const suffix = STATIC_PROMPT_SUFFIX ? "，" + STATIC_PROMPT_SUFFIX : "";
    setPrompt(parts.join("，") + suffix);
  }, [config, selections]);

  // Trigger prompt construction when dependencies change
  useEffect(() => {
    constructPrompt();
  }, [selections, constructPrompt]);


  // --- Handlers ---

  const handleSelectionChange = (categoryId: string, item: string) => {
    setSelections(prev => ({ ...prev, [categoryId]: item }));
  };

  const handleRandomize = () => {
    const newSelections: Record<string, string> = {};
    config.categories.forEach(cat => {
      if (cat.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * cat.items.length);
        newSelections[cat.id] = cat.items[randomIndex];
      }
    });
    setSelections(newSelections);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    const enhanced = await enhancePromptWithGemini(prompt);
    setPrompt(enhanced);
    setIsEnhancing(false);
  };

  const handleGenerate = async () => {
    setGenerationState(prev => ({ ...prev, isGenerating: true, progress: 0, imageUrl: null }));
    setErrorMsg(null);
    
    const usedSeed = isRandomSeed ? Math.floor(Math.random() * 1000000) : parseInt(seedInput) || 42;
    if (isRandomSeed) setSeedInput(usedSeed.toString());

    // Progress animation
    const interval = setInterval(() => {
      setGenerationState(prev => {
        if (prev.progress >= 90) return prev;
        return { ...prev, progress: prev.progress + 5 };
      });
    }, 500);

    try {
      // Convert resolution to aspect ratio for Imagen
      // 1024x1024 -> 1:1, 864x1152 -> 3:4, 1152x864 -> 4:3
      let aspectRatio = "1:1";
      if (resolution === "864x1152") aspectRatio = "3:4";
      if (resolution === "1152x864") aspectRatio = "4:3";

      const base64Image = await generateImageWithGemini(prompt, aspectRatio);

      if (!base64Image) {
        throw new Error("Generation returned empty result");
      }

      setGenerationState({
        isGenerating: false,
        progress: 100,
        imageUrl: base64Image,
        seed: usedSeed
      });

    } catch (e: any) {
      console.error("Generation Error:", e);
      let userMsg = "生成失败，请检查 API Key 或重试";
      
      // Robust error message extraction
      const detailedMsg = e.message || JSON.stringify(e) || String(e);

      // Check for specific API errors
      if (detailedMsg.includes("429") || detailedMsg.includes("quota") || detailedMsg.includes("RESOURCE_EXHAUSTED")) {
        userMsg = "API 配额已用尽 (429)。请休息片刻或检查您的 Google Cloud 账单。";
      } else if (detailedMsg.includes("API_KEY")) {
        userMsg = "API Key 无效，请检查环境配置。";
      } else if (e.message) {
        userMsg = e.message;
      }

      setErrorMsg(userMsg);
      setGenerationState(prev => ({ ...prev, isGenerating: false, progress: 0 }));
    } finally {
      clearInterval(interval);
    }
  };

  const handleSave = () => {
    if (generationState.imageUrl) {
      const link = document.createElement('a');
      link.href = generationState.imageUrl;
      link.download = `sweater_design_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex h-screen w-full bg-brand-50 text-brand-900 font-sans overflow-hidden">
      
      {/* --- Sidebar (Left) --- */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r border-brand-200 bg-white/50 backdrop-blur-md">
        
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-brand-100 bg-white">
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center text-white mr-3">
            <Palette size={20} />
          </div>
          <h1 className="font-bold text-2xl text-brand-800 tracking-tight">AI 毛衣设计师</h1>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Categories */}
          <div className="space-y-6">
            <div className="flex flex-col gap-3 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-400">款式定制</h2>
              <button 
                onClick={handleRandomize}
                className="w-full text-sm font-medium flex items-center justify-center gap-2 text-brand-700 hover:text-brand-900 transition-all bg-brand-100 hover:bg-brand-200 hover:shadow-sm py-3 px-4 rounded-xl border border-brand-200"
              >
                <Shuffle size={16} /> 随机灵感组合
              </button>
            </div>

            {config.categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <label className="text-sm font-semibold text-brand-700">{cat.label}</label>
                <div className="relative">
                  <select
                    value={selections[cat.id] || ''}
                    onChange={(e) => handleSelectionChange(cat.id, e.target.value)}
                    className="w-full appearance-none bg-white border border-brand-200 text-brand-800 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent shadow-sm transition-all"
                  >
                    {cat.items.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-brand-200/50 w-full" />

          {/* Technical Settings */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-400">画布设置</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700">画幅尺寸</label>
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res.value}
                    onClick={() => setResolution(res.value as Resolution)}
                    className={`text-xs py-2 px-1 rounded-lg border transition-all ${
                      resolution === res.value 
                      ? 'bg-brand-400 text-white border-brand-400 shadow-md' 
                      : 'bg-white text-brand-600 border-brand-200 hover:border-brand-300'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-semibold text-brand-700">种子数值</label>
               <div className="flex gap-2">
                 <input
                   type="number"
                   value={seedInput}
                   onChange={(e) => setSeedInput(e.target.value)}
                   disabled={isRandomSeed}
                   className={`flex-1 bg-white border border-brand-200 text-brand-800 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 ${isRandomSeed ? 'opacity-50' : ''}`}
                 />
                 <button
                   onClick={() => setIsRandomSeed(!isRandomSeed)}
                   className={`px-3 rounded-xl border transition-colors flex items-center gap-2 text-sm ${
                     isRandomSeed 
                     ? 'bg-brand-400 text-white border-brand-400' 
                     : 'bg-white text-brand-600 border-brand-200'
                   }`}
                 >
                   <Shuffle size={14} /> 随机
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-brand-100 bg-brand-50">
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="w-full py-3 flex items-center justify-center gap-2 text-brand-600 font-medium hover:text-brand-800 hover:bg-brand-100 rounded-xl transition-colors"
          >
            <Settings size={18} /> 维度配置管理
          </button>
        </div>
      </aside>

      {/* --- Main Area (Right) --- */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Canvas / Preview Area */}
        <div className="flex-1 bg-[#FDFBF7] relative flex items-center justify-center p-8 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30" 
             style={{ 
               backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
             }}>
          </div>

          <div 
            className="relative bg-white shadow-2xl shadow-brand-200/50 rounded-lg overflow-hidden transition-all duration-500 ease-in-out border border-brand-100"
            style={{
              width: resolution === "1024x1024" ? '60vh' : resolution === "1152x864" ? '70vh' : '50vh',
              aspectRatio: resolution === "1024x1024" ? '1/1' : resolution === "1152x864" ? '4/3' : '3/4',
            }}
          >
            {generationState.imageUrl ? (
              <img 
                src={generationState.imageUrl} 
                alt="Generated Design" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-brand-300 bg-brand-50/50 p-6 text-center">
                 {errorMsg ? (
                   <>
                    <AlertCircle size={64} className="mb-4 text-red-400 opacity-80" />
                    <p className="font-medium text-red-500 max-w-md">{errorMsg}</p>
                   </>
                 ) : (
                   <>
                    <Palette size={64} className="mb-4 opacity-50" />
                    <p className="font-medium">准备生成</p>
                   </>
                 )}
              </div>
            )}

            {/* Overlay Loader */}
            {generationState.isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                <div className="w-48 h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-300 to-brand-500 transition-all duration-300"
                    style={{ width: `${generationState.progress}%` }}
                  />
                </div>
                <p className="text-brand-600 mt-4 text-sm font-medium animate-pulse">正在编织细节...</p>
              </div>
            )}
            
            {/* Action Overlay (Hover) */}
             {generationState.imageUrl && !generationState.isGenerating && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                 <button 
                  onClick={() => setShowFullScreenImage(true)}
                  className="bg-white/90 p-2 rounded-lg shadow-lg hover:bg-white text-brand-700 transition-all backdrop-blur"
                  title="全屏查看"
                 >
                   <Maximize2 size={20} />
                 </button>
                 <button 
                  onClick={handleSave}
                  className="bg-brand-500/90 p-2 rounded-lg shadow-lg hover:bg-brand-500 text-white transition-all backdrop-blur"
                  title="保存图片"
                 >
                   <Download size={20} />
                 </button>
              </div>
             )}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="h-[280px] bg-white border-t border-brand-200 p-6 flex flex-col gap-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-20">
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1 h-full">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-full bg-brand-50/50 border border-brand-200 rounded-xl p-4 pr-32 text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white resize-none text-base leading-relaxed"
                placeholder="您的设计提示词将显示在这里..."
              />
              <button 
                 onClick={handleEnhancePrompt}
                 disabled={isEnhancing || !prompt}
                 className="absolute top-3 right-3 text-xs font-medium text-purple-600 bg-white/90 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border border-purple-100 shadow-sm backdrop-blur-sm"
               >
                 {isEnhancing ? (
                    <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 优化中...</span>
                 ) : (
                    <>
                      <Wand2 size={12} /> AI 魔法优化
                    </>
                 )}
               </button>
            </div>
            
            <div className="flex flex-col gap-3 w-48">
              <button 
                onClick={handleGenerate}
                disabled={generationState.isGenerating}
                className="flex-1 bg-gradient-to-br from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-400/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
              >
                {generationState.isGenerating ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-sm">正在生成...</span>
                  </>
                ) : (
                  <>
                    <Palette size={24} />
                    <span>生成设计图</span>
                  </>
                )}
              </button>
              
              <button 
                onClick={handleSave}
                disabled={!generationState.imageUrl}
                className="h-12 border-2 border-brand-200 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 hover:border-brand-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} /> 保存结果
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Full Screen Modal */}
      {showFullScreenImage && generationState.imageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowFullScreenImage(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            onClick={() => setShowFullScreenImage(false)}
          >
            <X size={32} />
          </button>
          <img 
            src={generationState.imageUrl} 
            alt="Full Screen Design" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Modals */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        config={config}
        onSave={setConfig}
      />
    </div>
  );
};

export default App;
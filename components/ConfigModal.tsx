import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, GripVertical, Layers, Key, CheckCircle, AlertTriangle, Cpu, Settings2, Globe, Network, Zap, Cloud, Link, Loader2, Play } from 'lucide-react';
import { Config, Category, ApiProvider, VerificationStatus } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { verifyConnection } from '../services/generationService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSave: (newConfig: Config) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<Config>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'categories' | 'env'>('categories');
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  // Verification State
  const [verifying, setVerifying] = useState<Record<string, VerificationStatus>>({});
  
  // Drag state
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Reset local config when modal opens
  useEffect(() => {
    if (isOpen) {
        const mergedConfig = JSON.parse(JSON.stringify(config));
        // Ensure keys/endpoints objects exist
        if (!mergedConfig.keys) mergedConfig.keys = {};
        if (!mergedConfig.endpoints) mergedConfig.endpoints = {};
        // Backward compatibility
        if (mergedConfig.userApiKey && Object.keys(mergedConfig.keys).length === 0) {
             // If user had a key but no specific keys, assume it was for the selected provider
             mergedConfig.keys[mergedConfig.apiProvider] = mergedConfig.userApiKey;
        }
        
        setLocalConfig(mergedConfig);
        setVerifying({}); // Reset verification status
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // --- Handlers ---
  
  const handleVerify = async (provider: ApiProvider) => {
      const key = localConfig.keys[provider];
      if (!key) return;

      setVerifying(prev => ({ ...prev, [provider]: 'verifying' }));
      
      const endpoint = localConfig.endpoints[provider];
      const isSuccess = await verifyConnection(provider, key, endpoint, localConfig.corsProxy);
      
      setVerifying(prev => ({ ...prev, [provider]: isSuccess ? 'success' : 'error' }));
  };

  const handleKeyChange = (provider: ApiProvider, val: string) => {
      setLocalConfig(prev => ({
          ...prev,
          keys: { ...prev.keys, [provider]: val }
      }));
      // Reset verification status on change
      setVerifying(prev => ({ ...prev, [provider]: 'idle' }));
  };
  
  const handleEndpointChange = (provider: ApiProvider, val: string) => {
      setLocalConfig(prev => ({
          ...prev,
          endpoints: { ...prev.endpoints, [provider]: val }
      }));
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      label: newCatName,
      items: []
    };
    setLocalConfig(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
    setNewCatName('');
    setSelectedCatIndex(localConfig.categories.length); // Select the new one
  };

  const handleDeleteCategory = (index: number) => {
    const newCats = [...localConfig.categories];
    newCats.splice(index, 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    if (selectedCatIndex >= newCats.length) {
      setSelectedCatIndex(Math.max(0, newCats.length - 1));
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || localConfig.categories.length === 0) return;
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.push(newItemName);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setNewItemName('');
  };

  const handleDeleteItem = (itemIndex: number) => {
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.splice(itemIndex, 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  // --- Drag & Drop Handlers ---
  const handleCatDragStart = (index: number) => { setDraggedCatIndex(index); };
  const handleCatDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleCatDrop = (dropIndex: number) => {
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return;
    const newCats = [...localConfig.categories];
    const [movedCat] = newCats.splice(draggedCatIndex, 1);
    newCats.splice(dropIndex, 0, movedCat);
    if (selectedCatIndex === draggedCatIndex) setSelectedCatIndex(dropIndex);
    else if (selectedCatIndex > draggedCatIndex && selectedCatIndex <= dropIndex) setSelectedCatIndex(selectedCatIndex - 1);
    else if (selectedCatIndex < draggedCatIndex && selectedCatIndex >= dropIndex) setSelectedCatIndex(selectedCatIndex + 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setDraggedCatIndex(null);
  };

  const handleItemDragStart = (index: number) => { setDraggedItemIndex(index); };
  const handleItemDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleItemDrop = (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    const newCats = [...localConfig.categories];
    const items = [...newCats[selectedCatIndex].items];
    const [movedItem] = items.splice(draggedItemIndex, 1);
    items.splice(dropIndex, 0, movedItem);
    newCats[selectedCatIndex].items = items;
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setDraggedItemIndex(null);
  };

  const activeCategory = localConfig.categories[selectedCatIndex];
  
  const getProviderDetails = (p: ApiProvider) => {
     switch(p) {
         case 'gemini': return { label: 'Google AI Studio Key', url: 'https://aistudio.google.com/app/apikey' };
         case 'huggingface': return { label: 'Hugging Face Token', url: 'https://huggingface.co/settings/tokens' };
         case 'modelscope': return { label: 'ModelScope Access Token', url: 'https://modelscope.cn/my/myaccesstoken' };
         case 'nvidia': return { label: 'NVIDIA API Key', url: 'https://build.nvidia.com/settings/api-keys' };
         case 'aliyun': return { label: 'Aliyun DashScope Key', url: 'https://bailian.console.aliyun.com/' };
         case 'qiniu': return { label: 'Qiniu API Key', url: 'https://portal.qiniu.com/ai-inference/api-key' };
         default: return { label: 'API Key', url: '#' };
     }
  };

  const activeProviderId = localConfig.apiProvider;
  const providerDetails = getProviderDetails(activeProviderId);
  const currentKey = localConfig.keys[activeProviderId] || '';
  const verifyState = verifying[activeProviderId] || 'idle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[650px] flex flex-col overflow-hidden border border-brand-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-brand-100 bg-brand-50">
          <h2 className="text-xl font-bold text-brand-800 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> 系统设置
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Main Sidebar (Tabs) */}
          <div className="w-48 bg-white border-r border-brand-100 flex flex-col py-4 gap-1">
             <button 
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'categories' ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'
                }`}
             >
                <Layers size={18} />
                维度配置
                {activeTab === 'categories' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-400" />}
             </button>
             <button 
                onClick={() => setActiveTab('env')}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'env' ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-50'
                }`}
             >
                <Key size={18} />
                API 环境
                {activeTab === 'env' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-400" />}
             </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* --- Tab: Categories --- */}
            {activeTab === 'categories' && (
              <>
                {/* Categories List */}
                <div className="w-1/3 border-r border-brand-100 flex flex-col bg-brand-50/30">
                  <div className="p-4 border-b border-brand-100">
                    <h3 className="font-semibold text-brand-700 mb-2 text-sm">分类列表</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="新建..." 
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      />
                      <button 
                        onClick={handleAddCategory}
                        disabled={!newCatName.trim()}
                        className="bg-brand-400 text-white p-2 rounded-lg hover:bg-brand-500 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="添加分类"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {localConfig.categories.map((cat, idx) => (
                      <div 
                        key={cat.id}
                        draggable
                        onDragStart={() => handleCatDragStart(idx)}
                        onDragOver={handleCatDragOver}
                        onDrop={() => handleCatDrop(idx)}
                        onClick={() => setSelectedCatIndex(idx)}
                        className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all group/item ${
                          idx === selectedCatIndex ? 'bg-white shadow-sm ring-1 ring-brand-200' : 'hover:bg-brand-100/50'
                        } ${draggedCatIndex === idx ? 'opacity-40 border-dashed border-2 border-brand-300' : ''}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <GripVertical size={14} className="text-brand-300 cursor-move flex-shrink-0 opacity-50 group-hover/item:opacity-100 transition-opacity" />
                          <span className="font-medium text-brand-800 truncate select-none text-sm">{cat.label}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(idx); }}
                          className="text-brand-300 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors"
                          title="删除此分类"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="w-2/3 flex flex-col bg-white">
                  <div className="p-4 border-b border-brand-100">
                    <h3 className="font-semibold text-brand-700 mb-2 text-sm">
                      <span className="text-brand-500">{activeCategory?.label || '请选择分类'}</span> 下的标签
                    </h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="新建标签选项..." 
                        disabled={!activeCategory}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      />
                      <button 
                        onClick={handleAddItem}
                        disabled={!activeCategory || !newItemName.trim()}
                        className="bg-brand-100 text-brand-700 p-2 rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="添加标签"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                    {activeCategory ? (
                      <div className="grid grid-cols-2 gap-3">
                        {activeCategory.items.map((item, idx) => (
                          <div 
                            key={idx} 
                            draggable
                            onDragStart={() => handleItemDragStart(idx)}
                            onDragOver={handleItemDragOver}
                            onDrop={() => handleItemDrop(idx)}
                            className={`flex justify-between items-center p-3 rounded-lg border border-brand-100 bg-brand-50/30 group hover:border-brand-300 transition-colors cursor-move ${
                              draggedItemIndex === idx ? 'opacity-40 border-dashed border-2 border-brand-300' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <GripVertical size={14} className="text-brand-300 flex-shrink-0" />
                              <span className="text-brand-800 select-none truncate text-sm">{item}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteItem(idx)}
                              className="text-brand-300 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {activeCategory.items.length === 0 && (
                          <div className="col-span-2 text-center py-10 text-brand-300 italic text-sm">
                            暂无标签，请在上方添加！
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-brand-300 text-sm">
                        请选择左侧分类以编辑标签
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* --- Tab: Environment --- */}
            {activeTab === 'env' && (
               <div className="flex-1 flex flex-col bg-white overflow-hidden">
                 {/* Provider Selector Strip */}
                 <div className="flex border-b border-brand-100 overflow-x-auto p-2 gap-2 bg-brand-50/50">
                    {[
                      { id: 'gemini', name: 'Google Gemini' },
                      { id: 'huggingface', name: 'Hugging Face' },
                      { id: 'modelscope', name: 'ModelScope' },
                      { id: 'nvidia', name: 'NVIDIA' },
                      { id: 'aliyun', name: 'Aliyun Wanx' },
                      { id: 'qiniu', name: 'Qiniu / OpenAI' },
                    ].map((provider) => {
                       const isConfigured = !!localConfig.keys[provider.id as ApiProvider];
                       const pStatus = verifying[provider.id] || 'idle';
                       
                       return (
                          <button
                             key={provider.id}
                             onClick={() => setLocalConfig(prev => ({ ...prev, apiProvider: provider.id as ApiProvider }))}
                             className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                               localConfig.apiProvider === provider.id 
                               ? 'bg-white shadow-sm text-brand-800 ring-1 ring-brand-200' 
                               : 'text-gray-500 hover:bg-brand-100/50 hover:text-brand-600'
                             }`}
                           >
                             {provider.name}
                             {/* Small Dot Status Indicator */}
                             {pStatus === 'success' ? (
                               <div className="w-2 h-2 rounded-full bg-green-500" />
                             ) : isConfigured && pStatus !== 'error' ? (
                               <div className="w-2 h-2 rounded-full bg-brand-200" />
                             ) : null}
                           </button>
                       );
                    })}
                 </div>

                 {/* Configuration Form */}
                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <div className="max-w-2xl mx-auto space-y-6">
                     
                     {/* 1. Header with Status */}
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${verifyState === 'success' ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-600'}`}>
                             {verifyState === 'verifying' ? <Loader2 className="animate-spin" size={24} /> : <Cpu size={24} />}
                           </div>
                           <div>
                             <h3 className="font-bold text-lg text-gray-800">{providerDetails.label.split(' ')[0]} 设置</h3>
                             <p className="text-xs text-gray-500">配置该服务商的 API 凭证</p>
                           </div>
                        </div>
                        <a 
                          href={providerDetails.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100"
                        >
                          <Link size={12} /> 获取密钥
                        </a>
                     </div>

                     {/* 2. Key Input */}
                     <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 block">
                           API Key / Token
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                             <input 
                                type="password" 
                                value={currentKey}
                                onChange={(e) => handleKeyChange(activeProviderId, e.target.value)}
                                placeholder={`请输入 ${activeProviderId} 的密钥...`}
                                className={`w-full pl-4 pr-10 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm font-mono transition-all ${
                                   verifyState === 'error' 
                                   ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                                   : verifyState === 'success'
                                     ? 'border-green-300 focus:ring-green-200 bg-green-50'
                                     : 'border-brand-200 focus:ring-brand-400 bg-white'
                                }`}
                             />
                             {verifyState === 'success' && (
                               <CheckCircle size={18} className="absolute right-3 top-3.5 text-green-500" />
                             )}
                          </div>
                          <button
                            onClick={() => handleVerify(activeProviderId)}
                            disabled={!currentKey || verifyState === 'verifying'}
                            className={`px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                              verifyState === 'success' 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:bg-gray-300'
                            }`}
                          >
                             {verifyState === 'verifying' ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                             {verifyState === 'verifying' ? '连接中' : '测试连接'}
                          </button>
                        </div>
                        
                        {/* Status Message */}
                        {verifyState === 'error' && (
                           <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                             <AlertTriangle size={12} /> 连接失败，请检查网络或密钥是否正确 (401/403/Failed to fetch)
                           </p>
                        )}
                        {verifyState === 'success' && (
                           <p className="text-xs text-green-600 flex items-center gap-1 animate-in slide-in-from-top-1">
                             <CheckCircle size={12} /> 连接验证通过，API 可用
                           </p>
                        )}
                     </div>

                     {/* 3. Endpoint (Conditional) */}
                     {(activeProviderId === 'qiniu' || activeProviderId === 'gemini' || localConfig.endpoints[activeProviderId]) && (
                        <div className="space-y-2 pt-2 border-t border-dashed border-gray-200">
                           <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-gray-700">自定义 Endpoint</label>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">可选</span>
                           </div>
                           <input 
                              type="text" 
                              value={localConfig.endpoints[activeProviderId] || ''}
                              onChange={(e) => handleEndpointChange(activeProviderId, e.target.value)}
                              placeholder={activeProviderId === 'qiniu' ? "https://api.openai.com/v1" : "默认地址"}
                              className="w-full px-4 py-3 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm font-mono bg-gray-50"
                           />
                           <p className="text-xs text-gray-400">
                             如果使用中转服务或自定义代理，请在此配置完整 URL 前缀。
                           </p>
                        </div>
                     )}

                     {/* 4. CORS (ModelScope only) */}
                     {activeProviderId === 'modelscope' && (
                       <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
                          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2 text-sm">
                            <Network size={16} /> 浏览器跨域设置
                          </h4>
                          <div className="space-y-2">
                             <input 
                                type="text" 
                                value={localConfig.corsProxy || ''}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, corsProxy: e.target.value }))}
                                placeholder={DEFAULT_CONFIG.corsProxy}
                                className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono bg-white"
                             />
                             <p className="text-xs text-blue-600 opacity-80">
                               ModelScope 网页端调用需要 CORS 代理，否则会报错 "Failed to fetch"。
                             </p>
                          </div>
                       </div>
                     )}

                     {/* 5. Advanced Z-Image Params */}
                     {(activeProviderId === 'huggingface' || activeProviderId === 'modelscope') && (
                        <div className="pt-4 border-t border-brand-100 mt-4">
                           <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-4 text-sm">
                             <Settings2 size={16} /> 模型参数 (Z-Image)
                           </h4>
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <label className="text-xs font-semibold text-gray-600">迭代步数 (Steps)</label>
                                  <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{localConfig.steps || 8}</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="1" max="50" 
                                  value={localConfig.steps || 8}
                                  onChange={(e) => setLocalConfig(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                                  className="w-full accent-brand-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <label className="text-xs font-semibold text-gray-600">时间偏移 (Time Shift)</label>
                                  <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{localConfig.timeShift || 3.0}</span>
                                </div>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={localConfig.timeShift || 3.0}
                                  onChange={(e) => setLocalConfig(prev => ({ ...prev, timeShift: parseFloat(e.target.value) }))}
                                  className="w-full px-3 py-2 rounded-lg border border-brand-200 text-sm"
                                />
                              </div>
                           </div>
                        </div>
                     )}

                   </div>
                 </div>
               </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-100 bg-brand-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-brand-600 font-medium hover:bg-brand-100 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-brand-400 text-white font-medium hover:bg-brand-500 shadow-lg shadow-brand-400/20 flex items-center gap-2 transition-transform active:scale-95">
            <Save size={18} />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
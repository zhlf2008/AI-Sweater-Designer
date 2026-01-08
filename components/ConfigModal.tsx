import React, { useState } from 'react';
import { X, Plus, Trash2, Save, GripVertical, Layers, Key, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';
import { Config, Category } from '../types';

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
  
  // Drag state
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // Safe check for API Key existence
  const hasApiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY;

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      label: newCatName,
      items: []
    };
    setLocalConfig(prev => ({
      categories: [...prev.categories, newCat]
    }));
    setNewCatName('');
    setSelectedCatIndex(localConfig.categories.length); // Select the new one
  };

  const handleDeleteCategory = (index: number) => {
    const newCats = [...localConfig.categories];
    newCats.splice(index, 1);
    setLocalConfig({ categories: newCats });
    if (selectedCatIndex >= newCats.length) {
      setSelectedCatIndex(Math.max(0, newCats.length - 1));
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || localConfig.categories.length === 0) return;
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.push(newItemName);
    setLocalConfig({ categories: newCats });
    setNewItemName('');
  };

  const handleDeleteItem = (itemIndex: number) => {
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.splice(itemIndex, 1);
    setLocalConfig({ categories: newCats });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  // --- Drag & Drop Handlers for Categories ---
  const handleCatDragStart = (index: number) => {
    setDraggedCatIndex(index);
  };

  const handleCatDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow dropping
  };

  const handleCatDrop = (dropIndex: number) => {
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return;
    
    const newCats = [...localConfig.categories];
    const [movedCat] = newCats.splice(draggedCatIndex, 1);
    newCats.splice(dropIndex, 0, movedCat);
    
    // Adjust selected index
    if (selectedCatIndex === draggedCatIndex) {
      setSelectedCatIndex(dropIndex);
    } else if (selectedCatIndex > draggedCatIndex && selectedCatIndex <= dropIndex) {
      setSelectedCatIndex(selectedCatIndex - 1);
    } else if (selectedCatIndex < draggedCatIndex && selectedCatIndex >= dropIndex) {
      setSelectedCatIndex(selectedCatIndex + 1);
    }
    
    setLocalConfig({ categories: newCats });
    setDraggedCatIndex(null);
  };

  // --- Drag & Drop Handlers for Items ---
  const handleItemDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow dropping
  };

  const handleItemDrop = (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    
    const newCats = [...localConfig.categories];
    const items = [...newCats[selectedCatIndex].items];
    const [movedItem] = items.splice(draggedItemIndex, 1);
    items.splice(dropIndex, 0, movedItem);
    
    newCats[selectedCatIndex].items = items;
    setLocalConfig({ categories: newCats });
    setDraggedItemIndex(null);
  };

  const activeCategory = localConfig.categories[selectedCatIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden border border-brand-100">
        
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
                        className="flex-1 px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                      />
                      <button 
                        onClick={handleAddCategory}
                        className="bg-brand-400 text-white p-2 rounded-lg hover:bg-brand-500 transition-colors"
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
                        className="flex-1 px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      />
                      <button 
                        onClick={handleAddItem}
                        disabled={!activeCategory}
                        className="bg-brand-100 text-brand-700 p-2 rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-50"
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
               <div className="flex-1 p-8 bg-white overflow-y-auto">
                 <div className="max-w-2xl mx-auto space-y-8">
                   
                   {/* Status Card */}
                   <div className={`border rounded-xl p-6 ${hasApiKey ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                     <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${hasApiKey ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {hasApiKey ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold mb-1 ${hasApiKey ? 'text-green-800' : 'text-amber-800'}`}>
                             {hasApiKey ? 'API Key 已配置' : 'API Key 未检测到'}
                          </h3>
                          <p className={`text-sm ${hasApiKey ? 'text-green-700' : 'text-amber-700'}`}>
                            {hasApiKey 
                              ? '系统已准备就绪，可以调用 AI 模型。' 
                              : '您需要配置环境变量 API_KEY 才能生成图片。'}
                          </p>
                        </div>
                     </div>
                   </div>

                   {/* API Info */}
                   <div className="space-y-4">
                     <h4 className="font-bold text-brand-800 flex items-center gap-2">
                       <Cpu size={18} /> API 服务信息
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                         <span className="text-xs font-bold text-brand-400 uppercase tracking-wider block mb-1">Provider</span>
                         <span className="font-semibold text-brand-900">Google Gemini API</span>
                       </div>
                       <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                         <span className="text-xs font-bold text-brand-400 uppercase tracking-wider block mb-1">Models</span>
                         <div className="text-sm text-brand-800">
                           <div>gemini-3-flash-preview (Text)</div>
                           <div>imagen-4.0-generate-001 (Image)</div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Instructions */}
                   <div className="space-y-4">
                     <h4 className="font-bold text-brand-800 flex items-center gap-2">
                       <Key size={18} /> 配置指南
                     </h4>
                     <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                       <div className="border-b border-gray-200 px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase">
                         配置方法 (Environment Variable)
                       </div>
                       <div className="p-4 space-y-4 text-sm text-gray-700">
                         <p>出于安全原因，API Key 必须通过环境变量注入，请勿直接在代码中输入。</p>
                         
                         <div>
                           <strong className="text-gray-900 block mb-1">部署到 Cloudflare Pages:</strong>
                           <ol className="list-decimal pl-5 space-y-1">
                             <li>进入项目 <strong>Settings</strong> &gt; <strong>Environment variables</strong></li>
                             <li>添加变量名: <code className="bg-gray-200 px-1 rounded text-red-600">API_KEY</code></li>
                             <li>变量值: 粘贴您的 Google AI Studio API Key</li>
                             <li>重新部署项目以生效。</li>
                           </ol>
                         </div>

                         <div>
                           <strong className="text-gray-900 block mb-1">本地运行 (Local):</strong>
                           <ul className="list-disc pl-5 space-y-1">
                             <li>在项目根目录创建 <code className="bg-gray-200 px-1 rounded">.env</code> 文件</li>
                             <li>添加内容: <code className="bg-gray-200 px-1 rounded text-blue-600">API_KEY=您的密钥...</code></li>
                             <li>或者在启动命令前添加: <code className="bg-gray-200 px-1 rounded">export API_KEY=...</code></li>
                           </ul>
                         </div>
                       </div>
                     </div>
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
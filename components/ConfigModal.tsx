import React, { useState } from 'react';
import { X, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Config, Category } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSave: (newConfig: Config) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<Config>(JSON.parse(JSON.stringify(config)));
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  // Drag state
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  if (!isOpen) return null;

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
            <span className="text-2xl">🛠️</span> 维度配置管理
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar: Categories */}
          <div className="w-1/3 border-r border-brand-100 flex flex-col bg-brand-50/50">
            <div className="p-4 border-b border-brand-100">
              <h3 className="font-semibold text-brand-700 mb-2">分类列表</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="新建分类..." 
                  className="flex-1 px-3 py-2 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                />
                <button 
                  onClick={handleAddCategory}
                  className="bg-brand-400 text-white p-2 rounded-lg hover:bg-brand-500 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="text-xs text-brand-400 mt-2">提示: 可拖动分类进行排序</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
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
                    <span className="font-medium text-brand-800 truncate select-none">{cat.label}</span>
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

          {/* Main: Items */}
          <div className="w-2/3 flex flex-col bg-white">
            <div className="p-4 border-b border-brand-100">
              <h3 className="font-semibold text-brand-700 mb-2">
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
            
            <div className="overflow-y-auto flex-1 p-4">
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
                        <span className="text-brand-800 select-none truncate">{item}</span>
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
                    <div className="col-span-2 text-center py-10 text-brand-300 italic">
                      暂无标签，请在上方添加！
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-brand-300">
                  请选择左侧分类以编辑标签
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-100 bg-brand-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-brand-600 font-medium hover:bg-brand-100 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-brand-400 text-white font-medium hover:bg-brand-500 shadow-lg shadow-brand-400/20 flex items-center gap-2 transition-transform active:scale-95">
            <Save size={18} />
            保存并刷新
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
import { useState } from 'react';
import {
  Shirt,
  Upload,
  Type,
  FolderOpen,
  Sparkles,
  Layers,
  Palette,
  ChevronRight,
} from 'lucide-react';

type SidebarTab = 'product' | 'uploads' | 'text' | 'saved' | 'quick' | 'layers';

interface DesignSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onUploadClick: () => void;
  onAddText: (text: string, fontFamily: string, color: string) => void;
  onHireDesigner: () => void;
  onQuickDesignSelect: (designUrl: string) => void;
}

const FONTS = [
  { id: 'arial', name: 'Arial', family: 'Arial, sans-serif' },
  { id: 'times', name: 'Times New Roman', family: 'Times New Roman, serif' },
  { id: 'courier', name: 'Courier', family: 'Courier New, monospace' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'impact', name: 'Impact', family: 'Impact, sans-serif' },
];

const TEXT_COLORS = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'red', name: 'Red', hex: '#EF4444' },
  { id: 'blue', name: 'Blue', hex: '#3B82F6' },
  { id: 'green', name: 'Green', hex: '#22C55E' },
  { id: 'yellow', name: 'Yellow', hex: '#EAB308' },
  { id: 'purple', name: 'Purple', hex: '#8B5CF6' },
  { id: 'pink', name: 'Pink', hex: '#EC4899' },
];

const QUICK_DESIGNS = [
  { id: 'abstract-1', name: 'Abstract Wave', url: '/designs/abstract-1.png' },
  { id: 'vintage-1', name: 'Vintage Badge', url: '/designs/vintage-1.png' },
  { id: 'minimal-1', name: 'Minimal Logo', url: '/designs/minimal-1.png' },
  { id: 'retro-1', name: 'Retro Text', url: '/designs/retro-1.png' },
  { id: 'nature-1', name: 'Nature Scene', url: '/designs/nature-1.png' },
  { id: 'geometric-1', name: 'Geometric', url: '/designs/geometric-1.png' },
];

const SAVED_DESIGNS = [
  { id: 'saved-1', name: 'My Logo', date: '2 days ago', thumbnail: '/saved/design-1.png' },
  { id: 'saved-2', name: 'Summer Collection', date: '1 week ago', thumbnail: '/saved/design-2.png' },
];

export default function DesignSidebar({
  activeTab,
  onTabChange,
  onUploadClick,
  onAddText,
  onHireDesigner,
  onQuickDesignSelect,
}: DesignSidebarProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [selectedColor, setSelectedColor] = useState(TEXT_COLORS[0]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const handleAddText = () => {
    if (textInput.trim()) {
      onAddText(textInput, selectedFont.family, selectedColor.hex);
      setTextInput('');
    }
  };

  const tabs = [
    { id: 'product' as SidebarTab, icon: Shirt, label: 'Product' },
    { id: 'uploads' as SidebarTab, icon: Upload, label: 'Uploads' },
    { id: 'text' as SidebarTab, icon: Type, label: 'Text' },
    { id: 'saved' as SidebarTab, icon: FolderOpen, label: 'Saved\ndesigns' },
    { id: 'quick' as SidebarTab, icon: Sparkles, label: 'Quick\nDesigns' },
    { id: 'layers' as SidebarTab, icon: Layers, label: 'Layers' },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full py-3 flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] text-center whitespace-pre-line leading-tight">
              {tab.label}
            </span>
          </button>
        ))}

        {/* Hire Designer - Special Button */}
        <div className="mt-auto mb-4">
          <button
            onClick={onHireDesigner}
            className="w-full py-3 flex flex-col items-center gap-1 text-purple-600 hover:bg-purple-50 transition-colors"
            title="Hire a Merch Maker Designer"
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] text-center leading-tight">
              Hire a<br />Designer
            </span>
          </button>
        </div>
      </div>

      {/* Content Panel */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Product Tab */}
        {activeTab === 'product' && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Product Options</h3>
            <p className="text-sm text-gray-500">
              Product selection is shown at the top of the page. Use &quot;Change product&quot; to switch products.
            </p>
          </div>
        )}

        {/* Uploads Tab */}
        {activeTab === 'uploads' && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Artwork</h3>
            <button
              onClick={onUploadClick}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Image
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              PNG or JPG, max 10MB
            </p>

            {/* Recent Uploads */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Uploads</h4>
              <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                No uploads yet
              </div>
            </div>
          </div>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Add Text</h3>
            
            {/* Text Input */}
            <div>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter your text..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              />
            </div>

            {/* Font Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
              <select
                value={selectedFont.id}
                onChange={(e) => {
                  const font = FONTS.find((f) => f.id === e.target.value);
                  if (font) setSelectedFont(font);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Formatting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBold(!isBold)}
                  className={`px-3 py-2 border rounded-lg font-bold text-sm transition-colors ${
                    isBold ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => setIsItalic(!isItalic)}
                  className={`px-3 py-2 border rounded-lg italic text-sm transition-colors ${
                    isItalic ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  I
                </button>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor.id === color.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Add Text Button */}
            <button
              onClick={handleAddText}
              disabled={!textInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Text to Design
            </button>
          </div>
        )}

        {/* Saved Designs Tab */}
        {activeTab === 'saved' && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Saved Designs</h3>
            
            {SAVED_DESIGNS.length > 0 ? (
              <div className="space-y-3">
                {SAVED_DESIGNS.map((design) => (
                  <button
                    key={design.id}
                    className="w-full flex items-center gap-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{design.name}</p>
                      <p className="text-xs text-gray-500">{design.date}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No saved designs yet
              </div>
            )}
          </div>
        )}

        {/* Quick Designs Tab */}
        {activeTab === 'quick' && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Designs</h3>
            <p className="text-xs text-gray-500 mb-4">
              Click to add pre-made designs to your canvas
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {QUICK_DESIGNS.map((design) => (
                <button
                  key={design.id}
                  onClick={() => onQuickDesignSelect(design.url)}
                  className="aspect-square bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center group"
                >
                  <div className="text-center">
                    <Sparkles className="w-6 h-6 text-gray-400 mx-auto group-hover:text-blue-500" />
                    <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-600">{design.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Layers</h3>
            <p className="text-sm text-gray-500">
              Manage the order of your design elements.
            </p>
            <div className="mt-4 text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-lg">
              Add elements to see layers
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

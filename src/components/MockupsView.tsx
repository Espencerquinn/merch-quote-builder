import { useState } from 'react';
import { ProductColor } from '@/lib/products';

interface MockupAngle {
  id: string;
  name: string;
  description: string;
}

const MOCKUP_ANGLES: MockupAngle[] = [
  { id: 'front', name: 'Front', description: 'Front view with design' },
  { id: 'back', name: 'Back', description: 'Back view' },
  { id: 'left-side', name: 'Left Side', description: 'Left side view' },
  { id: 'right-side', name: 'Right Side', description: 'Right side view' },
  { id: 'front-flat', name: 'Front Flat', description: 'Flat lay front view' },
  { id: 'detail', name: 'Detail', description: 'Close-up detail view' },
];

interface MockupsViewProps {
  selectedColor: ProductColor;
  designPreview?: string; // Base64 or URL of the design
}

export default function MockupsView({
  selectedColor,
}: MockupsViewProps) {
  const [selectedAngle, setSelectedAngle] = useState<string>('front');

  const selectedMockup = MOCKUP_ANGLES.find(m => m.id === selectedAngle);

  return (
    <div className="flex-1 flex bg-white">
      {/* Thumbnail Grid - Left Side */}
      <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {MOCKUP_ANGLES.map((angle) => (
            <button
              key={angle.id}
              onClick={() => setSelectedAngle(angle.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedAngle === angle.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Mockup Thumbnail */}
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: selectedColor.hex }}
              >
                {/* T-shirt shape indicator */}
                <div className="relative">
                  {/* Simple T-shirt silhouette */}
                  <svg
                    viewBox="0 0 100 100"
                    className="w-16 h-16"
                    style={{ fill: 'rgba(255,255,255,0.3)' }}
                  >
                    <path d="M20,25 L35,20 L35,30 L40,30 L40,20 L50,18 L60,20 L60,30 L65,30 L65,20 L80,25 L85,40 L75,45 L75,85 L25,85 L25,45 L15,40 Z" />
                  </svg>
                  
                  {/* Design placeholder on front view */}
                  {(angle.id === 'front' || angle.id === 'front-flat') && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-8 h-10 bg-white/80 rounded-sm flex items-center justify-center">
                      <span className="text-[6px] text-gray-400">Design</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Large Preview - Right Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="relative">
          {/* Large Mockup Display */}
          <div
            className="w-[500px] h-[600px] rounded-xl shadow-lg flex items-center justify-center"
            style={{ backgroundColor: selectedColor.hex }}
          >
            {/* T-shirt shape */}
            <div className="relative">
              <svg
                viewBox="0 0 100 100"
                className="w-80 h-80"
                style={{ fill: 'rgba(255,255,255,0.2)' }}
              >
                <path d="M20,25 L35,20 L35,30 L40,30 L40,20 L50,18 L60,20 L60,30 L65,30 L65,20 L80,25 L85,40 L75,45 L75,85 L25,85 L25,45 L15,40 Z" />
              </svg>
              
              {/* Design placeholder */}
              {(selectedAngle === 'front' || selectedAngle === 'front-flat') && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-40 h-48 bg-white/90 rounded-lg shadow-md flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">🎨</div>
                    <p className="text-sm font-medium">Your Design</p>
                    <p className="text-xs">Preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Angle Label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-900">{selectedMockup?.name}</p>
            <p className="text-xs text-gray-500">{selectedMockup?.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

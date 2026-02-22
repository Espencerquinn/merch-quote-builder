'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Canvas, Rect, IText, FabricImage, FabricObject } from 'fabric';
import { ProductColor, PrintArea, PrintAreaView } from '@/lib/products';
import { DesignElement } from '@/types';
import { Trash2 } from 'lucide-react';

interface CustomFabricObject extends FabricObject {
  customData?: {
    isDesignElement?: boolean;
    isBoundary?: boolean;
    type?: 'image' | 'text';
    id?: string;
    src?: string;
  };
}

export interface DesignCanvasHandle {
  addImage: (file: File) => void;
  addText: (text: string, fontFamily: string, color: string) => void;
}

interface DesignCanvasProps {
  selectedColor: ProductColor;
  printArea: PrintArea;
  printAreas: PrintArea[];
  activeView: PrintAreaView;
  onViewChange: (view: PrintAreaView) => void;
  onDesignChange: (elements: DesignElement[]) => void;
}

const DesignCanvas = forwardRef<DesignCanvasHandle, DesignCanvasProps>(function DesignCanvas(
  { selectedColor, printArea, printAreas, activeView, onViewChange, onDesignChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const printAreaRef = useRef(printArea);
  const [hasSelection, setHasSelection] = useState(false);

  const syncDesignState = useCallback(() => {
    if (!fabricRef.current) return;
    
    const objects = fabricRef.current.getObjects() as CustomFabricObject[];
    const elements: DesignElement[] = objects
      .filter((obj) => obj.customData?.isDesignElement)
      .map((obj) => ({
        id: obj.customData?.id || '',
        type: obj.customData?.type || 'image',
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width || 0,
        height: obj.height || 0,
        rotation: obj.angle || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
        src: obj.customData?.src,
        text: (obj as IText).text,
        fontFamily: (obj as IText).fontFamily,
        fontSize: (obj as IText).fontSize,
        fill: (obj as IText).fill as string,
      }));
    
    onDesignChange(elements);
  }, [onDesignChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addImage: (file: File) => {
      if (!fabricRef.current) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgData = event.target?.result as string;
        
        const img = await FabricImage.fromURL(imgData);
        const area = printAreaRef.current;
        const maxWidth = area.width * 0.8;
        const maxHeight = area.height * 0.8;
        
        const scale = Math.min(
          maxWidth / (img.width || 1),
          maxHeight / (img.height || 1),
          1
        );

        img.set({
          left: area.x + area.width / 2,
          top: area.y + area.height / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });
        
        (img as CustomFabricObject).customData = {
          isDesignElement: true,
          type: 'image',
          id: `img-${Date.now()}`,
          src: imgData,
        };

        fabricRef.current?.add(img);
        fabricRef.current?.setActiveObject(img);
        fabricRef.current?.renderAll();
      };
      reader.readAsDataURL(file);
    },
    
    addText: (text: string, fontFamily: string, color: string) => {
      if (!fabricRef.current) return;
      
      const area = printAreaRef.current;
      const textObj = new IText(text, {
        left: area.x + area.width / 2,
        top: area.y + area.height / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: fontFamily,
        fontSize: 32,
        fill: color,
      }) as CustomFabricObject;
      
      textObj.customData = {
        isDesignElement: true,
        type: 'text',
        id: `text-${Date.now()}`,
      };

      fabricRef.current.add(textObj as FabricObject);
      fabricRef.current.setActiveObject(textObj as FabricObject);
      fabricRef.current.renderAll();
    },
  }), []);

  useEffect(() => {
    printAreaRef.current = printArea;
  }, [printArea]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvasWidth = 500;
    const canvasHeight = 600;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: 'transparent',
      selection: true,
    });

    fabricRef.current = canvas;

    // Calculate centered print area position
    const centeredX = (canvasWidth - printArea.width) / 2;
    const centeredY = (canvasHeight - printArea.height) / 2;

    // Draw print area boundary - centered and with teal/cyan color like reference
    const boundary = new Rect({
      left: centeredX,
      top: centeredY,
      width: printArea.width,
      height: printArea.height,
      fill: 'transparent',
      stroke: '#14b8a6',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false,
    }) as CustomFabricObject;
    boundary.customData = { isBoundary: true };
    canvas.add(boundary);

    // Update printAreaRef with centered coordinates for element placement
    printAreaRef.current = {
      ...printArea,
      x: centeredX,
      y: centeredY,
    };

    // Configure selection styling for design elements
    canvas.selectionColor = 'rgba(20, 184, 166, 0.1)';
    canvas.selectionBorderColor = '#14b8a6';
    canvas.selectionLineWidth = 2;
    
    // Set default object controls styling
    FabricObject.prototype.set({
      borderColor: '#14b8a6',
      cornerColor: '#14b8a6',
      cornerStyle: 'circle',
      cornerSize: 10,
      transparentCorners: false,
      borderScaleFactor: 2,
    });

    // Event listeners
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));
    canvas.on('object:modified', syncDesignState);
    canvas.on('object:added', syncDesignState);
    canvas.on('object:removed', syncDesignState);

    return () => {
      canvas.dispose();
    };
  }, [printArea, syncDesignState]);

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    
    const activeObjects = fabricRef.current.getActiveObjects() as CustomFabricObject[];
    activeObjects.forEach((obj) => {
      if (obj.customData?.isDesignElement) {
        fabricRef.current?.remove(obj as FabricObject);
      }
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* View Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center gap-1">
          {printAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => onViewChange(area.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeView === area.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 relative" style={{ backgroundColor: '#e5e7eb' }}>
        {/* Delete button - floating */}
        {hasSelection && (
          <button
            onClick={deleteSelected}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}

        <div className="relative">
          {/* T-shirt mockup background */}
          <div
            className="absolute inset-0"
            style={{
              width: 500,
              height: 600,
              backgroundColor: selectedColor.hex,
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          
          <canvas ref={canvasRef} className="relative z-10" />
          
          {/* Print area label - positioned at bottom center of print area */}
          <div 
            className="absolute z-20 pointer-events-none"
            style={{
              left: '50%',
              bottom: (600 - printArea.height) / 2 - 30,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-teal-500 text-white text-xs font-medium px-3 py-1 rounded">
              Print area
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 text-xs text-gray-600 shadow">
          <p className="font-medium mb-1">Tips:</p>
          <ul className="space-y-0.5">
            <li>• Click and drag to move</li>
            <li>• Use corners to resize</li>
            <li>• Double-click text to edit</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export default DesignCanvas;

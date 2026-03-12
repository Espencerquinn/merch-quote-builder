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
  getCanvasState: () => string | null;
  loadCanvasState: (json: string) => void;
  getCanvasThumbnail: () => Promise<string | null>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface DesignCanvasProps {
  selectedColor: ProductColor;
  printArea: PrintArea;
  printAreas: PrintArea[];
  activeView: PrintAreaView;
  onViewChange: (view: PrintAreaView) => void;
  onDesignChange: (elements: DesignElement[]) => void;
  productImageUrl?: string | null;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;

const DesignCanvas = forwardRef<DesignCanvasHandle, DesignCanvasProps>(function DesignCanvas(
  { selectedColor, printArea, printAreas, activeView, onViewChange, onDesignChange, productImageUrl },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const printAreaRef = useRef(printArea);
  const productImageUrlRef = useRef(productImageUrl);
  const [hasSelection, setHasSelection] = useState(false);

  // History tracking for undo/redo
  const MAX_HISTORY = 50;
  const historyRef = useRef<string[]>([]);
  const historyPointerRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const pushHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback(() => {
    if (!fabricRef.current || isRestoringRef.current) return;

    // Extract only design elements (exclude boundary)
    const objects = fabricRef.current.getObjects() as CustomFabricObject[];
    const designObjects = objects.filter((obj) => obj.customData?.isDesignElement);

    // Serialize only design elements by temporarily removing non-design objects
    const nonDesign = objects.filter((obj) => !obj.customData?.isDesignElement);
    nonDesign.forEach((obj) => fabricRef.current!.remove(obj as FabricObject));

    const json = JSON.stringify(fabricRef.current.toJSON());

    // Restore non-design objects
    nonDesign.forEach((obj) => {
      fabricRef.current!.add(obj as FabricObject);
      fabricRef.current!.sendObjectToBack(obj as FabricObject);
    });

    // If pointer is not at the end, truncate forward history
    const pointer = historyPointerRef.current;
    if (pointer < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, pointer + 1);
    }

    // Don't push duplicate states
    if (historyRef.current.length > 0 && historyRef.current[historyRef.current.length - 1] === json) {
      return;
    }

    historyRef.current.push(json);

    // Enforce max history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_HISTORY);
    }

    historyPointerRef.current = historyRef.current.length - 1;
  }, []);

  const debouncedPushHistory = useCallback(() => {
    if (pushHistoryTimerRef.current) {
      clearTimeout(pushHistoryTimerRef.current);
    }
    pushHistoryTimerRef.current = setTimeout(() => {
      pushHistory();
    }, 100);
  }, [pushHistory]);

  // Keep ref in sync so imperative handle always has latest value
  useEffect(() => {
    productImageUrlRef.current = productImageUrl;
  }, [productImageUrl]);

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

    getCanvasState: () => {
      if (!fabricRef.current) return null;
      return JSON.stringify(fabricRef.current.toJSON());
    },

    loadCanvasState: (json: string) => {
      if (!fabricRef.current) return;
      fabricRef.current.loadFromJSON(json).then(() => {
        fabricRef.current?.renderAll();
        syncDesignState();
      });
    },

    getCanvasThumbnail: async () => {
      if (!fabricRef.current || !canvasRef.current) return null;

      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = CANVAS_WIDTH;
        offscreen.height = CANVAS_HEIGHT;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        // Fill background
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Load product image for canvas export (CDN supports CORS)
        const currentImageUrl = productImageUrlRef.current;
        if (currentImageUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Image load failed'));
              img.src = currentImageUrl;
            });

            const imgAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
            let drawW = CANVAS_WIDTH;
            let drawH = CANVAS_HEIGHT;
            let drawX = 0;
            let drawY = 0;

            if (imgAspect > canvasAspect) {
              drawH = CANVAS_WIDTH / imgAspect;
              drawY = (CANVAS_HEIGHT - drawH) / 2;
            } else {
              drawW = CANVAS_HEIGHT * imgAspect;
              drawX = (CANVAS_WIDTH - drawW) / 2;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } catch {
            // If proxy image fails, continue with gray background
          }
        }

        // Remove boundary objects, export via Fabric's toDataURL, then restore
        const allObjects = [...fabricRef.current.getObjects()] as CustomFabricObject[];
        const removedObjects: CustomFabricObject[] = [];
        for (const obj of allObjects) {
          if (!obj.customData?.isDesignElement) {
            fabricRef.current.remove(obj as FabricObject);
            removedObjects.push(obj);
          }
        }

        // Use Fabric.js's own toDataURL — renders fresh from object list, no stale canvas
        const designDataUrl = fabricRef.current.toDataURL({
          format: 'png',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          multiplier: 1,
        });

        // Restore removed objects
        for (const obj of removedObjects) {
          fabricRef.current.add(obj as FabricObject);
          fabricRef.current.sendObjectToBack(obj as FabricObject);
        }
        fabricRef.current.renderAll();

        // Draw Fabric design layer on top of product image
        const designImg = new Image();
        await new Promise<void>((resolve, reject) => {
          designImg.onload = () => resolve();
          designImg.onerror = () => reject(new Error('Design image load failed'));
          designImg.src = designDataUrl;
        });
        ctx.drawImage(designImg, 0, 0);

        return offscreen.toDataURL('image/jpeg', 0.7);
      } catch (err) {
        console.error('Failed to generate thumbnail:', err);
        return null;
      }
    },
    undo: () => {
      if (!fabricRef.current || historyPointerRef.current <= 0) return;

      historyPointerRef.current -= 1;
      const state = historyRef.current[historyPointerRef.current];

      isRestoringRef.current = true;

      // Remove all design elements first
      const objects = fabricRef.current.getObjects() as CustomFabricObject[];
      const designObjects = objects.filter((obj) => obj.customData?.isDesignElement);
      designObjects.forEach((obj) => fabricRef.current!.remove(obj as FabricObject));

      // Load the saved design state into a temp canvas, then merge objects
      const tempCanvas = new Canvas(document.createElement('canvas'), {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      tempCanvas.loadFromJSON(state).then(() => {
        const loadedObjects = tempCanvas.getObjects() as CustomFabricObject[];
        loadedObjects.forEach((obj) => {
          tempCanvas.remove(obj as FabricObject);
          fabricRef.current!.add(obj as FabricObject);
        });
        tempCanvas.dispose();
        fabricRef.current!.renderAll();
        isRestoringRef.current = false;
        syncDesignState();
      });
    },

    redo: () => {
      if (!fabricRef.current || historyPointerRef.current >= historyRef.current.length - 1) return;

      historyPointerRef.current += 1;
      const state = historyRef.current[historyPointerRef.current];

      isRestoringRef.current = true;

      // Remove all design elements first
      const objects = fabricRef.current.getObjects() as CustomFabricObject[];
      const designObjects = objects.filter((obj) => obj.customData?.isDesignElement);
      designObjects.forEach((obj) => fabricRef.current!.remove(obj as FabricObject));

      // Load the saved design state into a temp canvas, then merge objects
      const tempCanvas = new Canvas(document.createElement('canvas'), {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      tempCanvas.loadFromJSON(state).then(() => {
        const loadedObjects = tempCanvas.getObjects() as CustomFabricObject[];
        loadedObjects.forEach((obj) => {
          tempCanvas.remove(obj as FabricObject);
          fabricRef.current!.add(obj as FabricObject);
        });
        tempCanvas.dispose();
        fabricRef.current!.renderAll();
        isRestoringRef.current = false;
        syncDesignState();
      });
    },

    canUndo: () => historyPointerRef.current > 0,
    canRedo: () => historyPointerRef.current < historyRef.current.length - 1,
  }), [syncDesignState, pushHistory]);

  useEffect(() => {
    printAreaRef.current = printArea;
  }, [printArea]);

  // Stabilize printArea identity to avoid re-creating canvas on every render
  const printAreaKey = `${printArea.id}-${printArea.width}-${printArea.height}`;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 'transparent',
      selection: true,
    });

    fabricRef.current = canvas;

    // Calculate centered print area position
    const centeredX = (CANVAS_WIDTH - printArea.width) / 2;
    const centeredY = (CANVAS_HEIGHT - printArea.height) / 2;

    // Draw print area boundary
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

    // Update printAreaRef with centered coordinates
    printAreaRef.current = {
      ...printArea,
      x: centeredX,
      y: centeredY,
    };

    // Configure selection styling
    canvas.selectionColor = 'rgba(20, 184, 166, 0.1)';
    canvas.selectionBorderColor = '#14b8a6';
    canvas.selectionLineWidth = 2;

    FabricObject.prototype.set({
      borderColor: '#14b8a6',
      cornerColor: '#14b8a6',
      cornerStyle: 'circle',
      cornerSize: 10,
      transparentCorners: false,
      borderScaleFactor: 2,
    });

    // Reset history when view/canvas changes
    historyRef.current = [];
    historyPointerRef.current = -1;

    // Push initial empty state
    // (deferred to after boundary is set up, but boundary is excluded from history)
    setTimeout(() => pushHistory(), 0);

    // Event listeners
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));
    canvas.on('object:modified', () => { syncDesignState(); debouncedPushHistory(); });
    canvas.on('object:added', () => { syncDesignState(); debouncedPushHistory(); });
    canvas.on('object:removed', () => { syncDesignState(); debouncedPushHistory(); });

    return () => {
      if (pushHistoryTimerRef.current) {
        clearTimeout(pushHistoryTimerRef.current);
      }
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printAreaKey, syncDesignState, pushHistory, debouncedPushHistory]);

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
        {/* Delete button */}
        {hasSelection && (
          <button
            onClick={deleteSelected}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}

        <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          {/* Background layer — isolated from Fabric.js DOM */}
          <div className="absolute inset-0 z-0 rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {productImageUrl ? (
              <img
                src={productImageUrl}
                crossOrigin="anonymous"
                alt="Product"
                className="w-full h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ backgroundColor: selectedColor.hex }}
              />
            )}
          </div>

          {/* Fabric.js canvas — in its own container so React doesn't conflict with Fabric's DOM */}
          <div className="absolute inset-0 z-10">
            <canvas ref={canvasRef} />
          </div>

          {/* Print area label */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: '50%',
              bottom: (CANVAS_HEIGHT - printArea.height) / 2 - 30,
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

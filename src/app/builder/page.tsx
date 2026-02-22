'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Undo, Redo } from 'lucide-react';
import ProductSelector from '@/components/ProductSelector';
import DesignCanvas from '@/components/DesignCanvas';
import QuotePanel from '@/components/QuotePanel';
import DesignSidebar from '@/components/DesignSidebar';
import EmailCaptureModal, { EmailCaptureData } from '@/components/EmailCaptureModal';
import HighIntentModal, { HighIntentData } from '@/components/HighIntentModal';
import UploadArtworkModal from '@/components/UploadArtworkModal';
import HireDesignerModal from '@/components/HireDesignerModal';
import ProductSelectorModal from '@/components/ProductSelectorModal';
import MockupsView from '@/components/MockupsView';
import { getDefaultProduct, ProductColor, PrintAreaView } from '@/lib/products';
import { calculateQuote, isHighIntent, determineLeadCategory } from '@/lib/pricing';
import { DesignElement, DesignState } from '@/types';

type SidebarTab = 'product' | 'uploads' | 'text' | 'saved' | 'quick' | 'layers';

export default function BuilderPage() {
  const router = useRouter();
  const product = getDefaultProduct();
  const canvasRef = useRef<{ addImage: (file: File) => void; addText: (text: string, fontFamily: string, color: string) => void } | null>(null);
  
  // Design state
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0]);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    product.sizes.forEach(size => {
      initial[size.id] = 0;
    });
    return initial;
  });
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>('uploads');
  const [activeView, setActiveView] = useState<PrintAreaView>('front');
  const [viewMode, setViewMode] = useState<'design' | 'mockups'>('design');
  
  // Calculate total quantity from all sizes
  const quantity = Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0);
  
  // Modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showHighIntentModal, setShowHighIntentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHireDesignerModal, setShowHireDesignerModal] = useState(false);
  const [showProductSelectorModal, setShowProductSelectorModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailData, setEmailData] = useState<EmailCaptureData | null>(null);
  
  // Calculate quote
  const quote = calculateQuote(quantity);
  
  // Get current design state
  const getDesignState = useCallback((): DesignState => ({
    productId: product.id,
    colorId: selectedColor.id,
    quantity,
    elements: designElements,
  }), [product.id, selectedColor.id, quantity, designElements]);

  const handleDesignChange = useCallback((elements: DesignElement[]) => {
    setDesignElements(elements);
  }, []);

  const handleEmailQuote = () => {
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (data: EmailCaptureData) => {
    setIsSubmitting(true);
    setEmailData(data);
    
    try {
      const designState = getDesignState();
      const leadCategory = determineLeadCategory(quantity, quote.totalCost, data.isSellingThese);
      
      // Save quote to API
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designState,
          quote,
          lead: {
            ...data,
            category: leadCategory,
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save quote');
      
      setShowEmailModal(false);
      
      // Check if high intent - show upsell modal
      if (isHighIntent(quantity, quote.totalCost, data.isSellingThese)) {
        setShowHighIntentModal(true);
      } else {
        // Show success message
        alert('Quote sent! Check your email.');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHighIntentSubmit = async (data: HighIntentData) => {
    setIsSubmitting(true);
    
    try {
      // Send webhook to CRM
      await fetch('/api/webhook/high-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: emailData,
          highIntent: data,
          designState: getDesignState(),
          quote,
        }),
      });
      
      setShowHighIntentModal(false);
      alert('Thanks! Our team will reach out soon.');
    } catch (error) {
      console.error('Error sending high intent webhook:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadArtwork = (file: File) => {
    canvasRef.current?.addImage(file);
  };

  const handleAddText = (text: string, fontFamily: string, color: string) => {
    canvasRef.current?.addText(text, fontFamily, color);
  };

  const handleQuickDesignSelect = (designUrl: string) => {
    // For MVP, just log - would fetch and add the design
    console.log('Quick design selected:', designUrl);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">{product.name}</h1>
              <button 
                onClick={() => setShowProductSelectorModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Change product
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Undo className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Redo className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button 
                onClick={() => setViewMode('design')}
                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 ${
                  viewMode === 'design' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Design
              </button>
              <button 
                onClick={() => setViewMode('mockups')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'mockups' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Mockups
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Product Options Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Color Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Color</span>
              <div className="flex gap-1">
                {product.colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      selectedColor.id === color.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Quantities */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Sizes</span>
              <div className="flex gap-2">
                {product.sizes.map((size) => (
                  <div key={size.id} className="flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">{size.name}</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={sizeQuantities[size.id] || 0}
                      onChange={(e) => {
                        const value = Math.max(0, parseInt(e.target.value) || 0);
                        setSizeQuantities(prev => ({ ...prev, [size.id]: value }));
                      }}
                      className="w-14 px-2 py-1.5 border border-gray-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Size guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'design' ? (
          <>
            {/* Design Sidebar */}
            <DesignSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUploadClick={() => setShowUploadModal(true)}
              onAddText={handleAddText}
              onHireDesigner={() => setShowHireDesignerModal(true)}
              onQuickDesignSelect={handleQuickDesignSelect}
            />

            {/* Design Canvas */}
            <DesignCanvas
              ref={canvasRef}
              selectedColor={selectedColor}
              printArea={product.printAreas.find(p => p.id === activeView) || product.printAreas[0]}
              printAreas={product.printAreas}
              activeView={activeView}
              onViewChange={setActiveView}
              onDesignChange={handleDesignChange}
            />

            {/* Quote Panel */}
            <QuotePanel
              quote={quote}
              onEmailQuote={handleEmailQuote}
            />
          </>
        ) : (
          /* Mockups View */
          <MockupsView selectedColor={selectedColor} />
        )}
      </div>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
        isLoading={isSubmitting}
      />

      {/* High Intent Modal */}
      <HighIntentModal
        isOpen={showHighIntentModal}
        onClose={() => {
          setShowHighIntentModal(false);
          alert('Quote sent! Check your email.');
        }}
        onSubmit={handleHighIntentSubmit}
        isLoading={isSubmitting}
      />

      {/* Upload Artwork Modal */}
      <UploadArtworkModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadArtwork}
      />

      {/* Hire Designer Modal */}
      <HireDesignerModal
        isOpen={showHireDesignerModal}
        onClose={() => setShowHireDesignerModal(false)}
      />

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={showProductSelectorModal}
        onClose={() => setShowProductSelectorModal(false)}
        onSelectProduct={(productId) => {
          console.log('Selected product:', productId);
          // For MVP, just log - would switch to the selected product
        }}
      />
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Undo, Redo, Loader2 } from 'lucide-react';
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
import { calculateQuote, calculateProductQuote, isHighIntent, determineLeadCategory } from '@/lib/pricing';
import { DesignElement, DesignState } from '@/types';
import type { ProductDetail, NormalizedColour, NormalizedImage } from '@/lib/providers/types';

type SidebarTab = 'product' | 'uploads' | 'text' | 'saved' | 'quick' | 'layers';

function BuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productParam = searchParams.get('product'); // compound ID like "ascolour:5026"

  const defaultProduct = getDefaultProduct();
  const canvasRef = useRef<{ addImage: (file: File) => void; addText: (text: string, fontFamily: string, color: string) => void } | null>(null);

  // Product state from provider
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedColourId, setSelectedColourId] = useState<string>('');

  // Whether we have a provider-sourced product loaded
  const isProviderProduct = !!productParam && !!productDetail;

  // Derived from product detail
  const colours = productDetail?.colours || [];
  const images = productDetail?.images || [];
  const selectedColour = colours.find(c => c.id === selectedColourId) || colours[0];

  // Build product-like colors from normalized data for the color picker
  const providerColors: ProductColor[] = colours.map(c => ({
    id: c.id,
    name: c.name,
    hex: c.hex,
    mockupImage: '',
  }));

  const product = isProviderProduct ? {
    ...defaultProduct,
    id: productDetail.id,
    name: productDetail.name,
    description: productDetail.description,
    colors: providerColors.length > 0 ? providerColors : defaultProduct.colors,
  } : defaultProduct;

  // Design state
  const [selectedColor, setSelectedColor] = useState<ProductColor>(defaultProduct.colors[0]);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    defaultProduct.sizes.forEach(size => {
      initial[size.id] = 0;
    });
    return initial;
  });
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>('uploads');
  const [activeView, setActiveView] = useState<PrintAreaView>('front');
  const [viewMode, setViewMode] = useState<'design' | 'mockups'>('design');

  // Fetch product data when productParam changes
  useEffect(() => {
    if (!productParam) {
      setProductDetail(null);
      return;
    }

    let cancelled = false;
    setProductLoading(true);

    fetch(`/api/products/${encodeURIComponent(productParam)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load product (${r.status})`);
        return r.json();
      })
      .then((data: ProductDetail) => {
        if (cancelled) return;
        setProductDetail(data);

        // Auto-select first colour
        if (data.colours?.length > 0) {
          const first = data.colours[0];
          setSelectedColourId(first.id);
          setSelectedColor({
            id: first.id,
            name: first.name,
            hex: first.hex,
            mockupImage: '',
          });
        }

        // Reset size quantities to match real sizes from provider
        if (data.sizes?.length > 0) {
          const initial: Record<string, number> = {};
          data.sizes.forEach(size => { initial[size.id] = 0; });
          setSizeQuantities(initial);
        }
      })
      .catch(err => {
        if (!cancelled) setProductDetail(null);
        console.error('Error loading product:', err);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });

    return () => { cancelled = true; };
  }, [productParam]);

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

  // Calculate quote — use real pricing when available
  const hasRealPricing = !!(productDetail?.pricing);
  const quote = hasRealPricing
    ? calculateProductQuote(quantity, productDetail!.pricing!.baseRetailPrice)
    : calculateQuote(quantity);

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

      if (isHighIntent(quantity, quote.totalCost, data.isSellingThese)) {
        setShowHighIntentModal(true);
      } else {
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
    console.log('Quick design selected:', designUrl);
  };

  const handleSelectProduct = (compoundId: string) => {
    router.push(`/builder?product=${encodeURIComponent(compoundId)}`);
  };

  // Get the product image URL for the current view and colour
  const getProductImageUrl = (): string | null => {
    if (!isProviderProduct || !selectedColour) return null;

    // Find image matching current colour and view
    const match = images.find(
      img => img.colourId === selectedColour.id && img.view === activeView
    );
    if (match) return match.zoomUrl;

    // Fallback to front view for this colour
    const front = images.find(
      img => img.colourId === selectedColour.id && img.view === 'front'
    );
    return front?.zoomUrl || null;
  };

  // Get available views for the current product
  const availableViews = useMemo(() => {
    if (!isProviderProduct || !productDetail || !productDetail.availableViews) {
      return product.printAreas;
    }
    const views: { id: PrintAreaView; name: string; x: number; y: number; width: number; height: number }[] = [];
    for (const v of productDetail.availableViews) {
      if (v === 'front') views.push({ id: 'front', name: 'Front', x: 150, y: 120, width: 200, height: 250 });
      if (v === 'back') views.push({ id: 'back', name: 'Back', x: 150, y: 120, width: 200, height: 250 });
      if (v === 'side') views.push({ id: 'left-sleeve', name: 'Side', x: 50, y: 140, width: 80, height: 100 });
    }
    return views.length > 0 ? views : product.printAreas;
  }, [isProviderProduct, productDetail, product.printAreas]);

  const productImageUrl = getProductImageUrl();

  // Handle colour selection
  const handleColourSelect = (colourId: string) => {
    setSelectedColourId(colourId);
    const colour = colours.find(c => c.id === colourId);
    if (colour) {
      setSelectedColor({
        id: colour.id,
        name: colour.name,
        hex: colour.hex,
        mockupImage: '',
      });
    }
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
              {productLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading product...</span>
                </div>
              ) : (
                <>
                  <h1 className="text-base font-semibold text-gray-900">{product.name}</h1>
                  {isProviderProduct && productDetail.provider !== 'static' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {productDetail.provider} {productDetail.metadata?.styleCode as string || ''}
                    </span>
                  )}
                </>
              )}
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
              {isProviderProduct && colours.length > 0 ? (
                <div className="flex gap-1 items-center overflow-x-auto max-w-xl">
                  {colours.map((colour) => {
                    const isSelected = selectedColourId === colour.id;
                    return (
                      <button
                        key={colour.id}
                        onClick={() => handleColourSelect(colour.id)}
                        className={`flex-shrink-0 w-9 h-9 rounded border-2 overflow-hidden transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        title={colour.name}
                      >
                        {colour.thumbnailUrl ? (
                          <img
                            src={colour.thumbnailUrl}
                            alt={colour.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: colour.hex }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
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
              )}
              {isProviderProduct && selectedColour && (
                <span className="text-xs text-gray-500 flex-shrink-0">{selectedColour.name}</span>
              )}
            </div>

            {/* Size Quantities */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Sizes</span>
              <div className="flex gap-2">
                {(isProviderProduct && productDetail.sizes.length > 0
                  ? productDetail.sizes
                  : product.sizes
                ).map((size) => (
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
              printArea={availableViews.find(p => p.id === activeView) || availableViews[0]}
              printAreas={availableViews}
              activeView={activeView}
              onViewChange={setActiveView}
              onDesignChange={handleDesignChange}
              productImageUrl={productImageUrl}
            />

            {/* Quote Panel */}
            <QuotePanel
              quote={quote}
              onEmailQuote={handleEmailQuote}
              productName={isProviderProduct ? productDetail.name : undefined}
              isRealPricing={hasRealPricing}
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
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <BuilderPageContent />
    </Suspense>
  );
}

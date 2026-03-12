import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { ArrowLeft, Undo, Redo, Loader2, Save, Check, Monitor } from "lucide-react";
import ProductSelector from "@/components/ProductSelector";
import DesignCanvas from "@/components/DesignCanvas";
import QuotePanel from "@/components/QuotePanel";
import DesignSidebar from "@/components/DesignSidebar";
import EmailCaptureModal, { EmailCaptureData } from "@/components/EmailCaptureModal";
import HighIntentModal, { HighIntentData } from "@/components/HighIntentModal";
import UploadArtworkModal from "@/components/UploadArtworkModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/Toast";
import HireDesignerModal from "@/components/HireDesignerModal";
import ProductSelectorModal from "@/components/ProductSelectorModal";
import PostDesignModal from "@/components/PostDesignModal";
import MockupsView from "@/components/MockupsView";
import { getDefaultProduct, ProductColor, PrintAreaView } from "@/lib/products";
import type { DesignCanvasHandle } from "@/components/DesignCanvas";
import { calculateQuote, calculateProductQuote, isHighIntent, determineLeadCategory } from "@/lib/pricing";
import { DesignElement, DesignState } from "@/types";
import type { ProductDetail, NormalizedColour, NormalizedImage } from "@/lib/providers/types";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";

type BuilderSearch = {
  product?: string;
  edit?: string;
};

export const Route = createFileRoute("/builder")({
  validateSearch: (search: Record<string, unknown>): BuilderSearch => ({
    product: typeof search.product === "string" ? search.product : undefined,
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  component: BuilderPage,
});

type SidebarTab = "product" | "uploads" | "text" | "saved" | "quick" | "layers";

function BuilderPageContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product: productParam, edit: editParam } = Route.useSearch();

  const defaultProduct = getDefaultProduct();
  const canvasRef = useRef<DesignCanvasHandle | null>(null);

  // Product state from provider
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedColourId, setSelectedColourId] = useState<string>("");

  // Whether we have a provider-sourced product loaded
  const isProviderProduct = !!productParam && !!productDetail;

  // Derived from product detail
  const colours = productDetail?.colours || [];
  const images = productDetail?.images || [];
  const selectedColour = colours.find((c) => c.id === selectedColourId) || colours[0];

  // Build product-like colors from normalized data for the color picker
  const providerColors: ProductColor[] = colours.map((c) => ({
    id: c.id,
    name: c.name,
    hex: c.hex,
    mockupImage: "",
  }));

  const product = isProviderProduct
    ? {
        ...defaultProduct,
        id: productDetail.id,
        name: productDetail.name,
        description: productDetail.description,
        colors: providerColors.length > 0 ? providerColors : defaultProduct.colors,
      }
    : defaultProduct;

  // Design state
  const [selectedColor, setSelectedColor] = useState<ProductColor>(defaultProduct.colors[0]);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    defaultProduct.sizes.forEach((size) => {
      initial[size.id] = 0;
    });
    return initial;
  });
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>("uploads");
  const [activeView, setActiveView] = useState<PrintAreaView>("front");
  const [viewMode, setViewMode] = useState<"design" | "mockups">("design");

  // Fetch product data when productParam changes
  useEffect(() => {
    if (!productParam) {
      setProductDetail(null);
      return;
    }

    let cancelled = false;
    setProductLoading(true);

    supabase
      .from("products")
      .select("*")
      .eq("compound_id", productParam)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setProductDetail(null);
          console.error("Error loading product:", error);
          return;
        }

        // Build ProductDetail from DB row
        const colors = data.colors_json ? JSON.parse(data.colors_json) : [];
        const sizes = data.sizes_json ? JSON.parse(data.sizes_json) : [];
        const detailData = data.detail_json && data.detail_json !== "{}" ? JSON.parse(data.detail_json) : {};
        const metadata = data.metadata_json ? JSON.parse(data.metadata_json) : {};
        const images = detailData.images || [];

        // Parse images into NormalizedImage format
        const GENERIC_VIEWS = new Set(["BACK", "FRONT", "MAIN", "SIDE", "TURN"]);
        const normalizedImages: NormalizedImage[] = [];
        const viewSet = new Set<"front" | "back" | "side">();

        for (const img of images) {
          const imageType = (img.imageType || "").trim();
          if (!imageType || GENERIC_VIEWS.has(imageType)) continue;
          const parts = imageType.split(" - ");
          const colourName = parts[0].trim();
          if (GENERIC_VIEWS.has(colourName)) continue;
          const colourId = colourName.toLowerCase().replace(/[^a-z0-9]/g, "-");
          const view = (parts[1]?.trim().toLowerCase() || "front") as "front" | "back" | "side";
          if (view === "front" || view === "back" || view === "side") {
            viewSet.add(view === "front" || parts.length === 1 ? "front" : view);
            normalizedImages.push({
              url: img.urlStandard,
              thumbnailUrl: img.urlThumbnail,
              zoomUrl: img.urlZoom,
              view: parts.length === 1 ? "front" : view,
              colourId,
            });
          }
        }

        const detail: ProductDetail = {
          id: data.compound_id,
          name: data.name,
          description: data.description || "",
          productType: data.product_type || "",
          thumbnailUrl: data.thumbnail_url || null,
          provider: data.provider_id,
          colours: colors.map((c: { name: string; hex: string; thumbnailUrl?: string }) => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: c.name,
            hex: c.hex,
            thumbnailUrl: c.thumbnailUrl || null,
          })),
          images: normalizedImages,
          availableViews: Array.from(viewSet),
          sizes: sizes.map((s: string) => ({ id: s.toLowerCase(), name: s })),
          pricing: data.base_price_cents
            ? { baseRetailPrice: data.base_price_cents, currency: data.currency || "NZD", variants: [] }
            : undefined,
          metadata,
        };

        setProductDetail(detail);

        // Auto-select first colour
        if (detail.colours?.length > 0) {
          const first = detail.colours[0];
          setSelectedColourId(first.id);
          setSelectedColor({
            id: first.id,
            name: first.name,
            hex: first.hex,
            mockupImage: "",
          });
        }

        // Reset size quantities to match real sizes from provider
        if (detail.sizes?.length > 0) {
          const initial: Record<string, number> = {};
          detail.sizes.forEach((size) => {
            initial[size.id] = 0;
          });
          setSizeQuantities(initial);
        }
      })
      .catch((err) => {
        if (!cancelled) setProductDetail(null);
        console.error("Error loading product:", err);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
  const [showPostDesignModal, setShowPostDesignModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(editParam ?? null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate quote — use real pricing when available
  const hasRealPricing = !!productDetail?.pricing;
  const quote = hasRealPricing
    ? calculateProductQuote(quantity, productDetail!.pricing!.baseRetailPrice)
    : calculateQuote(quantity);

  // Get current design state
  const getDesignState = useCallback(
    (): DesignState => ({
      productId: product.id,
      colorId: selectedColor.id,
      quantity,
      elements: designElements,
    }),
    [product.id, selectedColor.id, quantity, designElements]
  );

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

      const { error } = await supabase.functions.invoke("quote-email", {
        body: {
          designState,
          quote,
          lead: {
            ...data,
            category: leadCategory,
          },
        },
      });

      if (error) throw error;

      setShowEmailModal(false);

      if (isHighIntent(quantity, quote.totalCost, data.isSellingThese)) {
        setShowHighIntentModal(true);
      } else {
        toast.success("Quote sent! Check your email.");
      }
    } catch (error) {
      console.error("Error saving quote:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHighIntentSubmit = async (data: HighIntentData) => {
    setIsSubmitting(true);

    try {
      await supabase.functions.invoke("high-intent-webhook", {
        body: {
          lead: emailData,
          highIntent: data,
          designState: getDesignState(),
          quote,
        },
      });

      setShowHighIntentModal(false);
      toast.success("Thanks! Our team will reach out soon.");
    } catch (error) {
      console.error("Error sending high intent webhook:", error);
      toast.error("Something went wrong. Please try again.");
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
    console.log("Quick design selected:", designUrl);
  };

  const handleSelectProduct = (compoundId: string) => {
    navigate({ to: "/builder", search: { product: compoundId } });
  };

  // Load existing decorated product for editing
  useEffect(() => {
    if (!editParam) return;
    let cancelled = false;

    supabase
      .from("decorated_products")
      .select("*")
      .eq("id", editParam)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setSavedDesignId(data.id);
        // Load the canvas state once the canvas is ready
        if (data.canvas_state_json) {
          const state =
            typeof data.canvas_state_json === "string"
              ? JSON.parse(data.canvas_state_json)
              : data.canvas_state_json;
          // Load per-view state for current view, or the whole state
          const viewState = state[activeView] || state;
          if (viewState && canvasRef.current) {
            canvasRef.current.loadCanvasState(
              typeof viewState === "string" ? viewState : JSON.stringify(viewState)
            );
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save design handler
  const handleSaveDesign = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Get canvas state for current view
      const canvasState = canvasRef.current?.getCanvasState() ?? null;
      const canvasStateObj: Record<string, string | null> = {};
      canvasStateObj[activeView] = canvasState;

      // Capture thumbnail of the current design
      const thumbnailUrl = (await canvasRef.current?.getCanvasThumbnail()) ?? null;

      const body = {
        base_product_id: productParam || product.id,
        name: product.name,
        selected_colour_id: selectedColourId || selectedColor.id,
        canvas_state_json: JSON.stringify(canvasStateObj),
        thumbnail_url: thumbnailUrl,
      };

      if (savedDesignId) {
        // Update existing
        const { data, error } = await supabase
          .from("decorated_products")
          .update(body)
          .eq("id", savedDesignId)
          .select()
          .single();

        if (error) throw error;
        if (data?.id) setSavedDesignId(data.id);
      } else if (user) {
        // Authenticated user: insert directly
        const { data, error } = await supabase
          .from("decorated_products")
          .insert({
            id: crypto.randomUUID(),
            ...body,
            user_id: user.id,
            status: "draft",
          })
          .select()
          .single();

        if (error) throw error;
        if (data?.id) setSavedDesignId(data.id);
      } else {
        // Anonymous: use edge function (creates claim token)
        const { data, error } = await supabase.functions.invoke("save-design", {
          body: {
            baseProductId: body.base_product_id,
            name: body.name,
            selectedColourId: body.selected_colour_id,
            canvasStateJson: body.canvas_state_json,
            thumbnailUrl: body.thumbnail_url,
          },
        });

        if (error) throw error;
        if (data?.id) setSavedDesignId(data.id);

        // Store claim token for anonymous users
        if (data?.claimToken) {
          localStorage.setItem("claimToken", data.claimToken);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setShowPostDesignModal(true);
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error("Failed to save design. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyProduct = () => {
    setShowPostDesignModal(false);
    if (savedDesignId) {
      navigate({ to: "/dashboard/products/$productId/checkout", params: { productId: savedDesignId } });
    } else {
      navigate({ to: "/dashboard/products" });
    }
  };

  const handleAddToStore = () => {
    setShowPostDesignModal(false);
    navigate({ to: "/dashboard/stores" });
  };

  // Get the product image URL for the current view and colour
  const getProductImageUrl = (): string | null => {
    if (!isProviderProduct || !selectedColour) return null;

    // Find image matching current colour and view
    const match = images.find(
      (img) => img.colourId === selectedColour.id && img.view === activeView
    );
    if (match) return match.zoomUrl;

    // Fallback to front view for this colour
    const front = images.find(
      (img) => img.colourId === selectedColour.id && img.view === "front"
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
      if (v === "front") views.push({ id: "front", name: "Front", x: 150, y: 120, width: 200, height: 250 });
      if (v === "back") views.push({ id: "back", name: "Back", x: 150, y: 120, width: 200, height: 250 });
      if (v === "side")
        views.push({ id: "left-sleeve", name: "Side", x: 50, y: 140, width: 80, height: 100 });
    }
    return views.length > 0 ? views : product.printAreas;
  }, [isProviderProduct, productDetail, product.printAreas]);

  const productImageUrl = getProductImageUrl();

  // Handle colour selection
  const handleColourSelect = (colourId: string) => {
    setSelectedColourId(colourId);
    const colour = colours.find((c) => c.id === colourId);
    if (colour) {
      setSelectedColor({
        id: colour.id,
        name: colour.name,
        hex: colour.hex,
        mockupImage: "",
      });
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasRef.current?.undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        canvasRef.current?.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile fallback */}
      <div className="lg:hidden h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-center">
        <Monitor className="w-16 h-16 text-gray-300 mb-6" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Desktop Required</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          The design builder works best on a larger screen. Please switch to a desktop or laptop for the best experience.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Browse Products Instead
        </Link>
      </div>

      <div className="hidden lg:flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/" })}
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
                  {isProviderProduct && productDetail.provider !== "static" && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {productDetail.provider}{" "}
                      {(productDetail.metadata?.styleCode as string) || ""}
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
              <button
                onClick={() => canvasRef.current?.undo()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => canvasRef.current?.redo()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("design")}
                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 ${
                  viewMode === "design"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setViewMode("mockups")}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === "mockups"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Mockups
              </button>
            </div>
            <button
              onClick={handleSaveDesign}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saveSuccess
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving
                ? "Saving..."
                : saveSuccess
                  ? "Saved!"
                  : savedDesignId
                    ? "Update Design"
                    : "Save Design"}
            </button>
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
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-300 hover:border-gray-400"
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
                          <div className="w-full h-full" style={{ backgroundColor: colour.hex }} />
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
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-300 hover:border-gray-400"
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
                {(isProviderProduct && productDetail.sizes?.length > 0
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
                        setSizeQuantities((prev) => ({ ...prev, [size.id]: value }));
                      }}
                      className="w-14 px-2 py-1.5 border border-gray-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm">Size guide</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === "design" ? (
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
              printArea={availableViews.find((p) => p.id === activeView) || availableViews[0]}
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
          toast.success("Quote sent! Check your email.");
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

      {/* Post-Design Modal */}
      <PostDesignModal
        isOpen={showPostDesignModal}
        onClose={() => setShowPostDesignModal(false)}
        onBuyProduct={handleBuyProduct}
        onAddToStore={handleAddToStore}
        productName={product.name}
      />
      </div>
    </>
  );
}

function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ErrorBoundary>
        <BuilderPageContent />
      </ErrorBoundary>
    </Suspense>
  );
}

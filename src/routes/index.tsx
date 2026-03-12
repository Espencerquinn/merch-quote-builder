import { createFileRoute, Link } from "@tanstack/react-router";
import { Shirt, Palette, Store, ShoppingBag, ArrowRight, Sparkles, Users, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shirt className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">Merch Makers</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </a>
            <Link to="/products" className="text-gray-300 hover:text-white transition-colors">
              Products
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Design, sell, and ship custom merch
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Your Brand,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Your Merch Store
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Design custom products from 600+ premium blanks, launch your own branded
            merch store, and start selling — all from one platform.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
            >
              <Shirt className="w-5 h-5" />
              Browse Products
            </Link>
            <Link
              to="/builder"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all border border-white/20"
            >
              <Palette className="w-5 h-5" />
              Start Designing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="max-w-5xl mx-auto mt-32">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            From idea to online store in minutes — no inventory, no upfront costs.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Shirt, color: "blue", title: "1. Choose a Product", desc: "Browse 600+ premium blanks from top suppliers. Pick your style, color, and size range." },
              { icon: Palette, color: "purple", title: "2. Design It", desc: "Upload artwork or add text with our drag-and-drop designer. See your design on the actual product." },
              { icon: Store, color: "green", title: "3. Launch Your Store", desc: "Create a branded storefront with your logo, colors, and products. Set your own prices and margins." },
              { icon: ShoppingBag, color: "orange", title: "4. Start Selling", desc: "Share your store link. We handle printing, packing, and shipping for every order." },
            ].map((step) => (
              <div key={step.title} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <div className={`w-12 h-12 bg-${step.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                  <step.icon className={`w-6 h-6 text-${step.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div id="features" className="max-w-5xl mx-auto mt-32">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Everything You Need</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            One platform to design, manage, and sell your custom merchandise.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Palette, color: "blue", title: "Visual Designer", desc: "Drag-and-drop design tool with real product mockups. Upload images, add text, position your artwork on front, back, and sleeves." },
              { icon: Store, color: "green", title: "Branded Storefronts", desc: "Launch your own merch store with custom branding — logo, header image, and theme colors. Get a unique URL to share." },
              { icon: Zap, color: "yellow", title: "Instant Pricing", desc: "See real-time quotes as you design. Volume discounts applied automatically. Set your own margins when you sell." },
              { icon: Shirt, color: "purple", title: "600+ Products", desc: "Tees, hoodies, tanks, and more from premium suppliers like AS Colour. Every color and size available." },
              { icon: Users, color: "pink", title: "No Inventory", desc: "We print and ship on demand. No minimum orders, no warehousing. You sell it, we fulfill it." },
              { icon: ShoppingBag, color: "orange", title: "Order Management", desc: "Track every order from your dashboard. See sales, manage products, and monitor your store from one place." },
            ].map((feature) => (
              <div key={feature.title} className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
                <feature.icon className={`w-8 h-8 text-${feature.color}-400 mb-4`} />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto mt-32 text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-10 border border-blue-500/30">
            <Store className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Ready to launch your merch store?</h2>
            <p className="text-gray-400 mb-6">
              Create an account, design your first product, and start selling in minutes.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors border border-gray-700 hover:border-gray-500"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 mt-20 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-gray-500" />
            <span className="text-gray-500">&copy; 2026 Merch Makers</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300">Privacy</a>
            <a href="#" className="hover:text-gray-300">Terms</a>
            <a href="#" className="hover:text-gray-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

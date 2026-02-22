import Link from "next/link";
import { Shirt, Palette, Calculator, Mail } from "lucide-react";

export default function Home() {
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
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </a>
            <Link
              href="/builder"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get a Quote
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Custom Merch,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Instant Quotes
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Design your custom merchandise and get an instant price estimate. 
            No commitments, no waiting. Just create and see your quote in real-time.
          </p>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
          >
            <Palette className="w-5 h-5" />
            Get a Quote
          </Link>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="max-w-5xl mx-auto mt-32">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <Shirt className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">1. Choose Your Product</h3>
              <p className="text-gray-400">
                Select from our premium blank options and pick your color and quantity.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">2. Design It</h3>
              <p className="text-gray-400">
                Upload your artwork or add text. Drag, resize, and position until it&apos;s perfect.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">3. Get Your Quote</h3>
              <p className="text-gray-400">
                See your price instantly. Email yourself the quote with your mockup included.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div id="pricing" className="max-w-3xl mx-auto mt-32">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Volume discounts automatically applied. No hidden fees.
          </p>
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-gray-400 text-sm mb-1">1-24 units</p>
                <p className="text-3xl font-bold text-white">$13</p>
                <p className="text-gray-500 text-sm">per shirt</p>
              </div>
              <div className="md:border-x border-gray-700">
                <p className="text-gray-400 text-sm mb-1">25-99 units</p>
                <p className="text-3xl font-bold text-white">$11.50</p>
                <p className="text-gray-500 text-sm">per shirt</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">100+ units</p>
                <p className="text-3xl font-bold text-white">$10</p>
                <p className="text-gray-500 text-sm">per shirt</p>
              </div>
            </div>
            <p className="text-center text-gray-500 text-sm mt-6">
              Includes premium blank + DTG printing. Small order setup fee ($35) for orders under 24 units.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto mt-32 text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-10 border border-blue-500/30">
            <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to create your merch?
            </h2>
            <p className="text-gray-400 mb-6">
              Design your shirt and get a quote emailed to you in minutes.
            </p>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Start Designing
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 mt-20 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-gray-500" />
            <span className="text-gray-500">© 2024 Merch Makers</span>
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

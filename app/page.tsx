import Image from "next/image";
import Link from "next/link";
import { Check, Zap, Search, Brain, Sparkles, Camera } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/seesaw_logo.png" alt="Seesaw" width={160} height={53} className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Log in
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-md shadow-orange-500/20"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image 
            src="/home01.png" 
            alt="Seesaw dashboard preview" 
            fill
            className="object-contain object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
            See what you sold.
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            The Live TV Dashboard that turns your orders into a visual feed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-gray-200 mb-10">
            <span className="flex items-center gap-2 drop-shadow-md">
              <Check className="h-5 w-5 text-orange-400" />
              No spreadsheets
            </span>
            <span className="flex items-center gap-2 drop-shadow-md">
              <Check className="h-5 w-5 text-orange-400" />
              No charts to decode
            </span>
            <span className="flex items-center gap-2 drop-shadow-md">
              <Check className="h-5 w-5 text-orange-400" />
              See what sold
            </span>
          </div>
          <Link
            href="/auth/sign-up"
            className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
          >
            Start your 14-day free trial
          </Link>
        </div>
      </section>

      {/* Sub-hero */}
      <section className="py-20 px-6 bg-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-gray-600 mb-4">
            Sales data is already in your store.
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
            Seesaw makes it visible — free for 14 days.
          </p>
          <p className="text-gray-600 text-lg">
            At a glance, see what's selling, what's moving fast, and what's quiet — all through your product imagery.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect your store</h3>
              <p className="text-gray-600">Install Seesaw in seconds. Your 14-day free trial starts immediately.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">See your sales visually</h3>
              <p className="text-gray-600">Access 3 live feeds that show different views of your sales.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Put it on display</h3>
              <p className="text-gray-600">Run Seesaw on an office or warehouse TV and watch sales happen in real time.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-12 text-gray-500">
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5 text-orange-500" />
              No setup
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5 text-orange-500" />
              No interaction required
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-5 w-5 text-orange-500" />
              Just a clear, visual pulse of your business
            </span>
          </div>
          <div className="text-center mt-10">
            <Link
              href="/auth/sign-up"
              className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
            >
              Try it now
            </Link>
          </div>
        </div>
      </section>

      {/* Why Seesaw */}
      <section className="py-24 px-6 bg-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why Seesaw</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Camera, title: "Image-first sales feed", desc: "See your products, not just numbers" },
              { icon: Brain, title: "Spot trends easily", desc: "Without digging into reports" },
              { icon: Sparkles, title: "Clean and modern", desc: "Beautiful, fast, and focused" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-100 transition-all">
                <item.icon className="h-8 w-8 text-orange-500 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-12 text-gray-600">
            Try it free for 14 days — no commitment required.
          </p>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-24 px-6 bg-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Who It's For</h2>
          <p className="text-center text-gray-600 mb-12">Perfect for:</p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            {[
              "Apparel & fashion brands",
              "DTC and lifestyle stores",
              "Merch teams and founders",
              "Anyone tired of staring at tables and charts",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-xl px-5 py-4">
                <Check className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xl text-gray-700 font-medium">
            If your products are visual, your sales should be too.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, fair pricing</h2>
          <p className="text-gray-600 mb-12">Start with a free trial. Keep Seesaw as long as it's useful.</p>
          
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-orange-100">
            <div className="inline-block bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-medium mb-6">
              14-day free trial
            </div>
            <div className="mb-8">
              <span className="text-5xl font-bold">$10</span>
              <span className="text-gray-500">/month</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500 mb-8">
              <span>✓ No tiers</span>
              <span>✓ No surprises</span>
              <span>✓ One low monthly cost</span>
            </div>
            <Link
              href="/auth/sign-up"
              className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
            >
              Start your free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-orange-50 border-t border-orange-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            See what you sold — free for 14 days.
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Your sales already look good.<br />
            Now make them easy to see.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
          >
            Try it today!
          </Link>
          <p className="mt-6">
            <span className="text-lg font-bold text-gray-900">
              Setup Under 1 Minute
            </span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Image src="/seesaw_icon.png" alt="Seesaw" width={32} height={32} className="h-8 w-auto" />
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link>
            <p className="text-sm">© 2026 Seesaw. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

import { Link } from 'react-router-dom';

/**
 * Landing Page - First impression of Fintastic
 * Clean, professional preview of the dashboard experience
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-pastel-beige">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-pastel-tan/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold text-text">
              Fintastic
            </Link>

            {/* Nav Buttons */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2 rounded-xl text-text hover:bg-pastel-orange/20 transition-colors text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-xl bg-pastel-green/40 text-text hover:bg-pastel-green/50 transition-colors text-sm font-semibold shadow-soft"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - 2 Column Layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEFT - Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text mb-6 leading-tight">
                Your money finally makes sense.
              </h1>
              <p className="text-lg md:text-xl text-text/60 mb-8 leading-relaxed">
                Fintastic turns messy income and confusing spending into a simple, intelligent plan you can actually follow.
              </p>
            </div>

            {/* Key Points */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
                <p className="text-base text-text/70">
                  Built for students, gig workers, freelancers and beginners
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
                <p className="text-base text-text/70">
                  Handles irregular income and real-life spending
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
                <p className="text-base text-text/70">
                  Powered by a smart financial coaching agent
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/signup"
                className="px-8 py-4 rounded-2xl bg-pastel-green/40 text-text font-semibold hover:bg-pastel-green/50 transition-all duration-300 shadow-soft hover:shadow-soft-lg text-center"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-2xl bg-white/80 text-text font-medium hover:bg-pastel-orange/20 transition-all duration-300 border border-pastel-tan/30 text-center"
              >
                Login
              </Link>
            </div>
          </div>

          {/* RIGHT - Dashboard Preview Card */}
          <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
            <h3 className="text-sm font-medium text-text/50 mb-6">This month overview</h3>
            
            <div className="space-y-6">
              {/* Balance */}
              <div>
                <p className="text-xs text-text/40 mb-1">Balance</p>
                <p className="text-3xl font-semibold text-text">₹18,000 – ₹26,000</p>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                  <p className="text-xs text-text/50 mb-1">Spending health</p>
                  <p className="text-sm font-medium text-text">On track</p>
                </div>
                <div className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20">
                  <p className="text-xs text-text/50 mb-1">Top focus</p>
                  <p className="text-sm font-medium text-text">Emergency Fund</p>
                </div>
              </div>

              {/* Mini Money Map */}
              <div className="pt-4 border-t border-pastel-tan/20">
                <p className="text-xs font-medium text-text/50 mb-4">Money Map</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text">Needs</span>
                      <span className="text-xs text-text/60">54%</span>
                    </div>
                    <div className="w-full h-2 bg-pastel-tan/20 rounded-full overflow-hidden">
                      <div className="h-full bg-pastel-green" style={{ width: '54%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text">Wants</span>
                      <span className="text-xs text-text/60">26%</span>
                    </div>
                    <div className="w-full h-2 bg-pastel-tan/20 rounded-full overflow-hidden">
                      <div className="h-full bg-pastel-orange" style={{ width: '26%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text">Goals</span>
                      <span className="text-xs text-text/60">12%</span>
                    </div>
                    <div className="w-full h-2 bg-pastel-tan/20 rounded-full overflow-hidden">
                      <div className="h-full bg-pastel-blue" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text">Obligations</span>
                      <span className="text-xs text-text/60">8%</span>
                    </div>
                    <div className="w-full h-2 bg-pastel-tan/20 rounded-full overflow-hidden">
                      <div className="h-full bg-pastel-tan" style={{ width: '8%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-12 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
            <h3 className="text-xl font-semibold text-text mb-3">
              Understand your money
            </h3>
            <p className="text-sm text-text/60">
              We analyse your habits and patterns automatically
            </p>
          </div>
          <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
            <h3 className="text-xl font-semibold text-text mb-3">
              Set goals that make sense
            </h3>
            <p className="text-sm text-text/60">
              From daily needs to long-term dreams
            </p>
          </div>
          <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
            <h3 className="text-xl font-semibold text-text mb-3">
              Get clear next steps
            </h3>
            <p className="text-sm text-text/60">
              No more confusion, only simple actions
            </p>
          </div>
        </div>
      </div>

      {/* What Makes Fintastic Different */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="bg-white/80 rounded-3xl p-8 md:p-12 shadow-soft border border-pastel-tan/20 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-8">
            What makes Fintastic different
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
              <p className="text-base text-text/70">
                Works for irregular and unstable income
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
              <p className="text-base text-text/70">
                No complex charts or finance terms
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
              <p className="text-base text-text/70">
                Gives real advice, not just data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-text/40 mt-2.5 flex-shrink-0"></span>
              <p className="text-base text-text/70">
                Acts like a personal money coach
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 pb-24">
        <div className="bg-white/80 rounded-3xl p-12 shadow-soft border border-pastel-tan/20 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-8">
            Ready to take control of your money?
          </h2>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 rounded-2xl bg-pastel-green/40 text-text font-semibold hover:bg-pastel-green/50 transition-all duration-300 shadow-soft hover:shadow-soft-lg"
          >
            Start your journey →
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Features Section Component
 * Lazy loaded for performance
 */
export default function Features() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="relative rounded-xl p-10 border border-border/50">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#635BFF] rounded-t-xl" />
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-[#635BFF]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#635BFF] mb-4">
            Income Intelligence
          </h3>
          <p className="text-text/70 text-sm leading-relaxed">
            Smart tracking and analysis of your income streams with predictive
            insights.
          </p>
        </div>

        <div className="relative rounded-xl p-10 border border-border/50">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#635BFF] rounded-t-xl" />
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-[#635BFF]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#635BFF] mb-4">
            Spending Behaviour
          </h3>
          <p className="text-text/70 text-sm leading-relaxed">
            Understand your spending patterns with detailed analytics and
            category breakdowns.
          </p>
        </div>

        <div className="relative rounded-xl p-10 border border-border/50">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#635BFF] rounded-t-xl" />
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-[#635BFF]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#635BFF] mb-4">
            Goal Planning
          </h3>
          <p className="text-text/70 text-sm leading-relaxed">
            Set and track financial goals with personalized recommendations
            and milestones.
          </p>
        </div>

        <div className="relative rounded-xl p-10 border border-border/50">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#635BFF] rounded-t-xl" />
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-[#635BFF]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#635BFF] mb-4">
            Fintastic AI
          </h3>
          <p className="text-text/70 text-sm leading-relaxed">
            Get intelligent financial advice powered by AI to make better
            money decisions.
          </p>
        </div>
      </div>
    </section>
  );
}




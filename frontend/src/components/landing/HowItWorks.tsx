/**
 * How It Works Section Component
 * Lazy loaded for performance
 */
export default function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
          How it works
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#635BFF]/10 rounded-full flex items-center justify-center text-2xl font-bold text-[#635BFF] mx-auto mb-4">
            1
          </div>
          <h3 className="text-xl font-semibold text-text mb-3">
            Connect & Track
          </h3>
          <p className="text-text/70">
            Securely connect your accounts and let Fintastic automatically
            track your income and expenses.
          </p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-[#635BFF]/10 rounded-full flex items-center justify-center text-2xl font-bold text-[#635BFF] mx-auto mb-4">
            2
          </div>
          <h3 className="text-xl font-semibold text-text mb-3">
            Get Insights
          </h3>
          <p className="text-text/70">
            Our AI analyzes your financial patterns and provides personalized
            insights and recommendations.
          </p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-[#635BFF]/10 rounded-full flex items-center justify-center text-2xl font-bold text-[#635BFF] mx-auto mb-4">
            3
          </div>
          <h3 className="text-xl font-semibold text-text mb-3">
            Achieve Goals
          </h3>
          <p className="text-text/70">
            Set financial goals and follow your personalized plan to reach
            them with confidence.
          </p>
        </div>
      </div>
    </section>
  );
}




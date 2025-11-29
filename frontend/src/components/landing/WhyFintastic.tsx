/**
 * Why Fintastic Section Component
 * Lazy loaded for performance
 */
export default function WhyFintastic() {
  return (
    <>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
            Why Fintastic
          </h2>
          <p className="text-lg text-text/70 max-w-2xl mx-auto leading-relaxed">
            Traditional financial tools are built for traditional jobs.
            Fintastic is designed for the modern economy—where income is
            variable, goals are personal, and financial planning needs to be
            flexible and intelligent.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-6">
            What makes it different
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-[#635BFF] mb-3">
              AI-Powered Insights
            </h3>
            <p className="text-text/70">
              Get personalized financial advice that adapts to your unique
              situation and goals.
            </p>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-[#635BFF] mb-3">
              Variable Income Support
            </h3>
            <p className="text-text/70">
              Built for freelancers, gig workers, and anyone with irregular
              income patterns.
            </p>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-[#635BFF] mb-3">
              Goal-Focused Planning
            </h3>
            <p className="text-text/70">
              Set meaningful financial goals and get actionable steps to achieve
              them faster.
            </p>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-[#635BFF] mb-3">
              Simple & Intuitive
            </h3>
            <p className="text-text/70">
              No complex spreadsheets or confusing interfaces—just clear
              insights and guidance.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}




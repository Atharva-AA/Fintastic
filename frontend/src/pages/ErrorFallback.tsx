import { Link, useRouteError } from 'react-router-dom';

export default function ErrorFallback() {
  const error = useRouteError() as { statusText?: string; message?: string };
  const message = error?.statusText || error?.message || 'Something went wrong';

  return (
    <div className="min-h-screen bg-pastel-beige flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/90 rounded-3xl p-8 shadow-soft border border-pastel-tan/30 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-pastel-orange/20 text-pastel-orange flex items-center justify-center text-2xl font-semibold">
          💿
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-text/40 mb-1">
            Unexpected Application Error
          </p>
          <h1 className="text-2xl font-semibold text-text mb-2">{message}</h1>
          <p className="text-sm text-text/60">
            Let&rsquo;s get you back on track. Choose an option below.
          </p>
        </div>
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="block w-full px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-semibold hover:bg-pastel-green/50 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="block w-full px-4 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}


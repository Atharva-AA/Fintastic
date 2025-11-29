import { Link } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout component
 * Provides consistent layout with navbar for public pages (Landing, Login, Signup)
 * Includes:
 * - Top-left: Fintastic logo/brand
 * - Right: Login | Sign up buttons
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="glass border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/" className="text-2xl font-bold text-primary">
              Fintastic
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-text hover:text-primary transition-colors duration-200 font-medium"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="btn-primary"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}


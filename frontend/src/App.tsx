import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/onboarding/ErrorBoundary';
import { router } from './routes';

console.log('🚀 App.tsx loaded');
console.log('🚀 Router:', router);

/**
 * Main App Component
 * Sets up React Router with BrowserRouter
 * All routing is configured in /routes/index.tsx
 */
function App() {
  console.log('🚀 App component rendering');
  
  try {
    return (
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ App error:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'white', minHeight: '100vh', color: 'black' }}>
        <h1 style={{ color: 'red' }}>Application Error</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto', color: 'black' }}>
          {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
        </pre>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer', background: '#635BFF', color: 'white', border: 'none', borderRadius: '4px' }}>
          Reload Page
        </button>
      </div>
    );
  }
}

export default App;

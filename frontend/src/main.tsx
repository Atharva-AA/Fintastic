import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

console.log('🚀 Main.tsx loaded');
console.log('🚀 Root element exists:', !!document.getElementById('root'));

// Error handling for root render
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('✅ Root element found');

  const root = createRoot(rootElement);
  
  console.log('✅ Creating root render');
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: white; min-height: 100vh; color: black;">
        <h1 style="color: red;">Application Error</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; color: black;">
          ${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
        </pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer; background: #635BFF; color: white; border: none; border-radius: 4px;">
          Reload Page
        </button>
      </div>
    `;
  } else {
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: white; min-height: 100vh; color: black;">
        <h1 style="color: red;">Critical Error: Root element not found</h1>
        <p>Please check index.html</p>
      </div>
    `;
  }
}

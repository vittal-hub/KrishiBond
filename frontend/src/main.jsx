import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#FFFEFB',
                color: '#1C2B22',
                border: '1px solid rgba(28,43,34,0.08)',
                borderRadius: '4px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#2F5233', secondary: '#FFFEFB' } },
              error: { iconTheme: { primary: '#B4502A', secondary: '#FFFEFB' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

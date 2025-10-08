import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Handle OAuth callback - only if we're on dashboard with session
    if (router.pathname === '/dashboard' && router.query.session) {
      console.log('🔄 OAuth callback detected in _app.js');
      // The session will be handled by the dashboard component
    }
  }, [router]);

  return <Component {...pageProps} />;
}
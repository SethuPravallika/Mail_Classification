import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const BACKEND_URL = 'http://localhost:5001';

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    const savedKey = localStorage.getItem('openaiKey');
    
    if (sessionId && savedKey) {
      router.push('/dashboard');
    } else if (savedKey) {
      setOpenaiKey(savedKey);
      setIsSaved(true);
    }

    if (router.query.error) {
      setError('Authentication failed. Please try again.');
    }
  }, [router]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    setError('');
    
    if (!openaiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    if (!openaiKey.startsWith('sk-')) {
      setError('Invalid API key format (must start with sk-)');
      return;
    }

    localStorage.setItem('openaiKey', openaiKey.trim());
    setIsSaved(true);
  };

  const handleGoogleLogin = () => {
    if (!isSaved) {
      setError('Please save your API key first');
      return;
    }

    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  return (
    <>
      <Head>
        <title>Email Classifier - Login</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Email Classifier</h1>
            <p className="text-blue-200">AI-powered email organization</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSaveKey} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-3">
                OpenAI API Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-blue-300 text-xs mt-2">
                Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">OpenAI Platform</a>
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              {isSaved ? '✓ API Key Saved' : 'Save API Key'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-transparent text-blue-200">Then</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={!isSaved}
            className="w-full bg-white text-gray-700 py-4 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="mt-6 text-center space-y-2 text-blue-300 text-sm">
            <p>🔐 Secure OAuth authentication</p>
            <p>🤖 AI-powered classification</p>
          </div>
        </div>
      </div>
    </>
  );
}
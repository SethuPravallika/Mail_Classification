import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [classifiedEmails, setClassifiedEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailCount, setEmailCount] = useState(15);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const BACKEND_URL = 'http://localhost:5001';

  const cleanHtmlContent = (html) => {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .trim();
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const sessionId = localStorage.getItem('sessionId');
    const openaiKey = localStorage.getItem('openaiKey');
    const urlSession = router.query.session;
    
    if (urlSession) {
      localStorage.setItem('sessionId', urlSession);
      window.history.replaceState({}, '', window.location.pathname);
      checkSession(urlSession);
    } else if (!sessionId || !openaiKey) {
      router.push('/');
    } else {
      checkSession(sessionId);
    }
  }, [router, isClient]);

  const checkSession = async (sessionId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/session/${sessionId}`);
      const data = await response.json();
      
      if (data.valid && data.user) {
        setUser(data.user);
        setSessionChecked(true);
      } else {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('openaiKey');
        setSessionChecked(true);
        router.push('/?error=session_expired');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      router.push('/?error=server_error');
    }
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    setClassifiedEmails([]);
    setSelectedEmail(null);
    setError('');
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      
      const response = await fetch(`${BACKEND_URL}/api/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          maxResults: emailCount
        }),
      });

      const data = await response.json();
      
      if (data.success && data.emails) {
        setEmails(data.emails);
        console.log(`✅ Fetched ${data.emails.length} emails`);
      } else {
        setError(data.error || 'Failed to fetch emails');
        if (data.error?.includes('session')) {
          router.push('/?error=session_expired');
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Error fetching emails');
    } finally {
      setIsLoading(false);
    }
  };

  const classifyEmails = async () => {
    if (emails.length === 0) {
      setError('Please fetch emails first');
      return;
    }

    setIsClassifying(true);
    setError('');
    
    try {
      const openaiKey = localStorage.getItem('openaiKey');
      
      console.log('🤖 Starting classification...');
      console.log('Emails to classify:', emails.length);
      
      const response = await fetch(`${BACKEND_URL}/api/classify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails: emails,
          openaiApiKey: openaiKey,
          categoryDefinitions: {
            Important: "Emails that are personal or work-related and require immediate attention like class, placement drive, message from internshala or any other important requirement",
            Promotions: "Emails related to sales, discounts, and marketing campaigns",
            Social: "Emails from social networks, friends, and family",
            Marketing: "Emails related to marketing, newsletters, and notifications from linkedin, internshala job opportunities, zomato, swiggy, and similar platforms",
            Spam: "Unwanted or unsolicited emails",
            General: "If none of the above are matched, use General"
          }
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Classification failed');
      }

      const data = await response.json();
      console.log('Classification response:', data);
      
      if (data.success && data.classifications) {
        setClassifiedEmails(data.classifications);
        console.log(`✅ Classified ${data.classifications.length} emails`);
        
        if (data.stats?.byCategory) {
          console.log('📊 Distribution:', data.stats.byCategory);
        }
      } else {
        throw new Error(data.error || 'Classification failed');
      }
    } catch (error) {
      console.error('❌ Classification error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsClassifying(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Important: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      Promotions: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      Social: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      Marketing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      Spam: 'bg-red-500/20 text-red-300 border-red-500/30',
      General: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return colors[category] || colors.General;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Important: '🔔',
      Promotions: '🎁',
      Social: '👥',
      Marketing: '📢',
      Spam: '🚫',
      General: '📧'
    };
    return icons[category] || icons.General;
  };

  const getCategoryDescription = (category) => {
    const descriptions = {
      Important: 'Personal or work-related emails requiring immediate attention (class, placements, internshala)',
      Promotions: 'Sales, discounts, and marketing campaigns',
      Social: 'Social networks, friends, and family',
      Marketing: 'Marketing newsletters and notifications (LinkedIn, Internshala jobs, Zomato, Swiggy)',
      Spam: 'Unwanted or unsolicited emails',
      General: 'General emails not matching other categories'
    };
    return descriptions[category] || descriptions.General;
  };

  const filteredEmails = classifiedEmails.length > 0 
    ? (activeTab === 'all' ? classifiedEmails : classifiedEmails.filter(e => e.category === activeTab))
    : (activeTab === 'all' ? emails : []);

  const categoryCounts = classifiedEmails.reduce((acc, email) => {
    acc[email.category] = (acc[email.category] || 0) + 1;
    return acc;
  }, {});

  const logout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      try {
        await fetch(`${BACKEND_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('sessionId');
    localStorage.removeItem('openaiKey');
    router.push('/');
  };

  if (!isClient || !sessionChecked || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Email Classifier - Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-white">Email Classifier</h1>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <span className="text-blue-200 text-sm">{user.name}</span>
                )}
                <button
                  onClick={logout}
                  className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 text-red-300">
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Email Detail Modal */}
          {selectedEmail && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {selectedEmail.subject || 'No Subject'}
                    </h2>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div><span className="text-blue-300">From:</span> <span className="text-white">{selectedEmail.from}</span></div>
                    {selectedEmail.date && (
                      <div><span className="text-blue-300">Date:</span> <span className="text-white">{new Date(selectedEmail.date).toLocaleString()}</span></div>
                    )}
                  </div>

                  {selectedEmail.category && (
                    <div className="mt-4 space-y-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(selectedEmail.category)}`}>
                        {getCategoryIcon(selectedEmail.category)} {selectedEmail.category}
                      </span>
                      <p className="text-gray-400 text-xs mt-2">{getCategoryDescription(selectedEmail.category)}</p>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {selectedEmail.body && (
                    <div className="bg-white rounded-lg p-6">
                      {selectedEmail.isHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: cleanHtmlContent(selectedEmail.body) }} />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-800">{selectedEmail.body}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-8">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Emails to Fetch
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={emailCount}
                  onChange={(e) => setEmailCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>
              
              <button
                onClick={fetchEmails}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Fetching...' : 'Fetch Emails'}
              </button>

              <button
                onClick={classifyEmails}
                disabled={isClassifying || emails.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isClassifying ? 'Classifying...' : 'Classify Emails'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-blue-300 text-sm">Fetched</div>
                <div className="text-white text-2xl font-bold">{emails.length}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-green-300 text-sm">Classified</div>
                <div className="text-white text-2xl font-bold">{classifiedEmails.length}</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="text-purple-300 text-sm">Categories</div>
                <div className="text-white text-2xl font-bold">{Object.keys(categoryCounts).length}</div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          {classifiedEmails.length > 0 && (
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-8">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg border ${activeTab === 'all' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-gray-500/10 text-gray-300'}`}
                >
                  All ({classifiedEmails.length})
                </button>
                {Object.entries(categoryCounts).map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`px-4 py-2 rounded-lg border ${activeTab === category ? getCategoryColor(category) : 'bg-gray-500/10 text-gray-300'}`}
                  >
                    {getCategoryIcon(category)} {category} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email List */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
            {filteredEmails.length > 0 ? (
              <div className="divide-y divide-white/10">
                {filteredEmails.map((email, index) => (
                  <div
                    key={index}
                    className="p-6 hover:bg-white/10 cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-semibold">{email.subject || 'No Subject'}</h3>
                          {email.category && (
                            <span className={`px-2 py-1 rounded-full text-xs border ${getCategoryColor(email.category)}`}>
                              {getCategoryIcon(email.category)} {email.category}
                            </span>
                          )}
                        </div>
                        <p className="text-blue-200 text-sm">From: {email.from}</p>
                        {email.snippet && (
                          <p className="text-gray-400 text-sm mt-2">{email.snippet}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white">No emails to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
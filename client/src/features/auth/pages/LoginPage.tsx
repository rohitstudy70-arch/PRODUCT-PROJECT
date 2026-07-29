import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Dialog } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { ROUTES } from '../../../config/routes';
import api, { CLOUD_SERVER_URL, getBaseURL } from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Mail, Lock, LogIn, Settings, Zap, Check, Server, RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@arshi.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  const { setAuth, user: cachedUser, accessToken: cachedToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentUrl(getBaseURL());
    const saved = localStorage.getItem('custom_server_url');
    if (saved) {
      setCustomUrl(saved);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    setIsWakingServer(false);

    // Timeout notice if server takes > 3.5s (indicates cold start on free cloud host)
    const slowNoticeTimer = setTimeout(() => {
      setIsWakingServer(true);
    }, 3500);

    try {
      const response = await api.post('/auth/login', { email, password });
      clearTimeout(slowNoticeTimer);
      const { accessToken, user } = response.data.data;

      // Update auth store & cache credentials
      setAuth(user, accessToken);
      localStorage.setItem('arshi_last_email', user.email);
      toast.success('Login successful! Redirecting...');

      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
      }, 500);
    } catch (error: any) {
      clearTimeout(slowNoticeTimer);
      console.error('Login error:', error);

      // Check if network error or cloud server sleep occurred
      const isNetworkErr = error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response;

      // FAST FALLBACK: If user previously logged in on this device, grant instant access!
      if (isNetworkErr && cachedUser && cachedToken) {
        toast.info('⚡ Cloud server waking up in background. Granting instant session access!');
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD);
        }, 600);
        return;
      }

      if (isNetworkErr) {
        toast.error('Cloud server is waking up (~15s delay). You can switch to Local Server in ⚙️ Settings for instant speed.', { duration: 6000 });
      } else {
        const msg = error.response?.data?.message || error.message || 'Login failed. Please check credentials.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setIsWakingServer(false);
    }
  };

  const handleSaveServerConfig = (urlToSet: string) => {
    const trimmed = urlToSet.trim();
    if (!trimmed || trimmed === CLOUD_SERVER_URL) {
      localStorage.removeItem('custom_server_url');
      setCurrentUrl(CLOUD_SERVER_URL);
      toast.success('Switched to Cloud Server (Render)');
    } else {
      let finalUrl = trimmed;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'http://' + finalUrl;
      }
      if (!finalUrl.endsWith('/api/v1')) {
        finalUrl = finalUrl.replace(/\/+$/, '') + '/api/v1';
      }
      localStorage.setItem('custom_server_url', finalUrl);
      setCurrentUrl(finalUrl);
      toast.success(`Server URL updated to: ${finalUrl}`);
    }
    setServerModalOpen(false);
  };

  const isLocalServer = !currentUrl.includes('onrender.com');

  return (
    <>
      <Toaster position="top-right" theme="dark" closeButton />
      <Card className="border-0 bg-transparent shadow-none relative">
        {/* Top Header Server Switcher Badge */}
        <div className="flex items-center justify-between mb-4">
          <Badge
            variant="outline"
            className={`text-[10px] px-2.5 py-1 font-mono flex items-center space-x-1 cursor-pointer transition-all ${
              isLocalServer
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50'
                : 'border-indigo-500/40 text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50'
            }`}
            onClick={() => setServerModalOpen(true)}
            title="Click to configure Local Server IP or Cloud Server"
          >
            <Server className="h-3 w-3 mr-1" />
            <span>{isLocalServer ? '⚡ Local Wi-Fi (Instant)' : '🌐 Cloud (Render)'}</span>
          </Badge>

          <button
            onClick={() => setServerModalOpen(true)}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center space-x-1 p-1"
          >
            <Settings className="h-4 w-4" />
            <span className="text-[11px] underline">Server Setup</span>
          </button>
        </div>

        <CardHeader className="p-0 pb-4 text-center">
          <CardTitle className="text-xl font-bold text-slate-100">Access Account</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Sign in with your enterprise credentials
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  type="email"
                  placeholder="admin@arshi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Server Waking Notice if > 3.5s */}
            {isWakingServer && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1 text-amber-300 text-xs animate-pulse">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-bold">Cloud Server Waking Up (~15s on free tier)...</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: Connect to Local Wi-Fi server for <strong>instant 10ms response</strong>!
                </p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center space-x-2 mt-2"
            >
              <LogIn className="h-4 w-4" />
              <span>{loading ? (isWakingServer ? 'Connecting to Cloud...' : 'Signing In...') : 'Sign In'}</span>
            </Button>

            {/* Instant Session Resume Button if cached user exists */}
            {cachedUser && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toast.success('⚡ Resuming session instantly!');
                  navigate(ROUTES.DASHBOARD);
                }}
                className="w-full h-9 border-indigo-500/40 text-indigo-300 bg-indigo-950/30 text-xs flex items-center justify-center space-x-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span>Instant Resume Session ({cachedUser.firstName || 'User'})</span>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Server Settings Dialog */}
      <Dialog isOpen={serverModalOpen} onClose={() => setServerModalOpen(false)} title="⚙️ Server Connection Settings">
        <div className="space-y-4 p-1 text-xs">
          <p className="text-slate-400 text-xs">
            Choose your backend server connection mode. For <strong>instant login without 15s delay</strong>, connect your phone/laptop to local Wi-Fi and use your Local Server IP address.
          </p>

          <div className="space-y-2">
            {/* Quick Option 1: Cloud Server */}
            <button
              onClick={() => handleSaveServerConfig(CLOUD_SERVER_URL)}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                !isLocalServer
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-100 flex items-center">
                  🌐 Cloud Server (Render Free Host)
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{CLOUD_SERVER_URL}</p>
                <p className="text-[10px] text-amber-400/90 mt-1">⚠️ Sleeps after 15m inactivity (~15-20s cold start)</p>
              </div>
              {!isLocalServer && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
            </button>

            {/* Quick Option 2: Localhost / Local IP */}
            <button
              onClick={() => handleSaveServerConfig('http://192.168.1.5:5000/api/v1')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                isLocalServer
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-100 flex items-center">
                  ⚡ Local Wi-Fi Network Server (Instant Speed)
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">http://192.168.x.x:5000/api/v1</p>
                <p className="text-[10px] text-emerald-400 mt-1">🚀 10ms response time | 0 cold start delay</p>
              </div>
              {isLocalServer && <Check className="h-5 w-5 text-emerald-400 shrink-0" />}
            </button>
          </div>

          {/* Custom Server URL Input */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300">Custom Local Server IP / Domain</label>
            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="e.g. 192.168.1.10:5000 or http://10.0.2.2:5000/api/v1"
                className="font-mono text-xs bg-slate-950 border-slate-800"
              />
              <Button
                type="button"
                onClick={() => handleSaveServerConfig(customUrl)}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs px-4"
              >
                Apply
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              Note: For Android Emulator, use <code>http://10.0.2.2:5000/api/v1</code>. For physical Android APK, enter your PC's Wi-Fi IP address.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setServerModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
export default LoginPage;

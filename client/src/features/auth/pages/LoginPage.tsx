import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { ROUTES } from '../../../config/routes';
import api, { getStoredServerUrl, updateApiBaseUrl } from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Mail, Lock, LogIn, Server, Wifi } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(getStoredServerUrl());
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleServerChange = (newUrl: string) => {
    setServerUrl(newUrl);
    updateApiBaseUrl(newUrl);
    toast.success(`Server switched to: ${newUrl.includes('192.168') ? 'Local Wi-Fi PC Server' : 'Cloud Render Server'}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user } = response.data.data;

      // Update state
      setAuth(user, accessToken);
      toast.success('Welcome back, login successful!');

      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
      }, 800);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Login failed. Please verify credentials or network.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" theme="dark" closeButton />
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-0 pb-4 text-center">
          <CardTitle className="text-xl font-bold text-slate-100">Access Account</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Sign in with your enterprise credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
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

            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center space-x-2 mt-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </form>

          {/* Server Connection Selector */}
          <div className="pt-3 border-t border-slate-800/80">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between mb-1.5">
              <span className="flex items-center space-x-1">
                <Server className="h-3 w-3 text-indigo-400" />
                <span>Backend Server Connection</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleServerChange('https://product-project-wmc4.onrender.com/api/v1')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  serverUrl.includes('onrender')
                    ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center space-x-1 text-[11px]">
                  <Server className="h-3 w-3" />
                  <span>Cloud Server</span>
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">Render Cloud</div>
              </button>

              <button
                type="button"
                onClick={() => handleServerChange('http://192.168.1.101:5000/api/v1')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  serverUrl.includes('192.168')
                    ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center space-x-1 text-[11px]">
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span>Local Wi-Fi PC</span>
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">192.168.1.101</div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
export default LoginPage;

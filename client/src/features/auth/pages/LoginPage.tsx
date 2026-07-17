import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { ROUTES } from '../../../config/routes';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { Mail, Lock, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

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
      const msg = error.response?.data?.message || 'Login failed. Please verify credentials.';
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

            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center space-x-2 mt-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};
export default LoginPage;

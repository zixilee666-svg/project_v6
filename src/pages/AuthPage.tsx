import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Eye, EyeOff, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('joan_auth_token');
    if (token) navigate('/', { replace: true });
  }, [navigate]);

  // Login state
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '123456' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    displayName: '',
    institution: '',
    researchField: '',
  });
  const [regError, setRegError] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await authService.login(loginForm.username, loginForm.password);
      if (res.success && res.data) {
        localStorage.setItem('joan_auth_token', res.data.token);
        localStorage.setItem('joan_academic_user', JSON.stringify(res.data.user));
        navigate('/', { replace: true });
      } else {
        setLoginError(res.error || '登录失败');
      }
    } catch (err: any) {
      setLoginError(err.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRegError('');
    if (regForm.username.length < 3 || regForm.username.length > 20) {
      setRegError('用户名长度需在 3-20 个字符之间');
      setIsLoading(false);
      return;
    }
    if (regForm.password.length < 6) {
      setRegError('密码长度至少 6 位');
      setIsLoading(false);
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setRegError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }
    try {
      const res = await authService.register({
        username: regForm.username,
        password: regForm.password,
        displayName: regForm.displayName || undefined,
        email: regForm.email || undefined,
        institution: regForm.institution || undefined,
        researchField: regForm.researchField || undefined,
      });
      if (res.success && res.data) {
        localStorage.setItem('joan_auth_token', res.data.token);
        localStorage.setItem('joan_academic_user', JSON.stringify(res.data.user));
        navigate('/', { replace: true });
      } else {
        setRegError(res.error || '注册失败');
      }
    } catch (err: any) {
      setRegError(err.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRegField = (field: string, value: string) => {
    setRegForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory-100 dark:bg-primary-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-glow mb-4"
          >
            <Scale className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-primary-800 dark:text-ivory-100">
            Joan's Academic Hub
          </h1>
          <p className="text-sm text-primary-400 mt-1">贞德·达尔克学术专属空间</p>
        </div>

        <Card className="border-primary-200 dark:border-primary-700">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="text-center pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1 gap-1.5">
                  <LogIn className="w-4 h-4" />
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1 gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  注册
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* ── Login Tab ── */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="text-center mb-2">
                    <CardTitle className="text-xl">欢迎回来</CardTitle>
                    <CardDescription>登录以继续您的学术研究</CardDescription>
                  </div>

                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-md bg-error/10 text-error text-sm"
                    >
                      {loginError}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-username">用户名</Label>
                    <Input
                      id="login-username"
                      placeholder="请输入用户名"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        登录中...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        登录
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-primary-400">
                      默认账户: admin / 123456
                    </p>
                  </div>
                </CardContent>
              </form>
            </TabsContent>

            {/* ── Register Tab ── */}
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="text-center mb-2">
                    <CardTitle className="text-xl">创建账户</CardTitle>
                    <CardDescription>加入 Joan's Academic Hub 学术社区</CardDescription>
                  </div>

                  {regError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-md bg-error/10 text-error text-sm"
                    >
                      {regError}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reg-username">用户名 <span className="text-primary-400 text-xs">(3-20 字符)</span></Label>
                    <Input
                      id="reg-username"
                      placeholder="请输入用户名"
                      value={regForm.username}
                      onChange={(e) => updateRegField('username', e.target.value)}
                      required
                      minLength={3}
                      maxLength={20}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-displayname">显示名称</Label>
                    <Input
                      id="reg-displayname"
                      placeholder="可选，如：张三"
                      value={regForm.displayName}
                      onChange={(e) => updateRegField('displayName', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">邮箱</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="可选，example@mail.com"
                      value={regForm.email}
                      onChange={(e) => updateRegField('email', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密码 <span className="text-primary-400 text-xs">(至少 6 位)</span></Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={regForm.password}
                        onChange={(e) => updateRegField('password', e.target.value)}
                        required
                        minLength={6}
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">确认密码</Label>
                    <Input
                      id="reg-confirm"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      value={regForm.confirmPassword}
                      onChange={(e) => updateRegField('confirmPassword', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-institution">所在机构</Label>
                    <Input
                      id="reg-institution"
                      placeholder="可选，如：清华大学"
                      value={regForm.institution}
                      onChange={(e) => updateRegField('institution', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-field">研究领域</Label>
                    <Input
                      id="reg-field"
                      placeholder="可选，如：图神经网络、自然语言处理"
                      value={regForm.researchField}
                      onChange={(e) => updateRegField('researchField', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        注册中...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        注册
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-primary-400 mt-6">
          以圣洁纯粹之心，行理性严谨之事
        </p>
      </motion.div>
    </div>
  );
}

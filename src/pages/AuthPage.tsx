// ========================================
// AuthPage — 登录/注册页面 (优化版 v2)
// ========================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Eye, EyeOff, ArrowRight, LogIn, UserPlus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// 密码强度计算
function calculatePasswordStrength(password: string): { score: number; label: string; color: string; bgColor: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: '弱', color: 'text-red-500', bgColor: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: '中等', color: 'text-yellow-500', bgColor: 'bg-yellow-500' };
  if (score <= 4) return { score: 3, label: '良好', color: 'text-blue-500', bgColor: 'bg-blue-500' };
  return { score: 4, label: '强', color: 'text-green-500', bgColor: 'bg-green-500' };
}

// 用户名验证规则
function validateUsername(username: string): { valid: boolean; message: string } {
  if (!username) return { valid: false, message: '' };
  if (username.length < 3) return { valid: false, message: '用户名至少需要 3 个字符' };
  if (username.length > 20) return { valid: false, message: '用户名不能超过 20 个字符' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: '只能包含字母、数字和下划线' };
  if (/^[0-9]/.test(username)) return { valid: false, message: '不能以数字开头' };
  return { valid: true, message: '' };
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const checkUsernameTimeout = useRef<NodeJS.Timeout | null>(null);

  // 从 URL 参数获取初始标签
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'register' ? 'register' : 'login';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Check if already authenticated
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceLogin = params.get('force') === '1';
    if (forceLogin) return;
    const justLoggedOut = sessionStorage.getItem('joan_just_logged_out') === 'true';
    if (justLoggedOut) {
      sessionStorage.removeItem('joan_just_logged_out');
      return;
    }
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
  
  // 用户名检查状态
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameCheckMessage, setUsernameCheckMessage] = useState('');
  
  // 密码强度
  const passwordStrength = calculatePasswordStrength(regForm.password);

  // 用户名实时检查（防抖 500ms）
  const checkUsernameAvailability = useCallback(async (username: string) => {
    // 先验证格式
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameCheckStatus('invalid');
      setUsernameCheckMessage(validation.message);
      return;
    }
    
    // Mock模式模拟检查
    const takenUsernames = ['admin', 'joan', 'user', 'test', 'root', 'system', 'master'];
    setUsernameCheckStatus('checking');
    setUsernameCheckMessage('检查中...');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (takenUsernames.includes(username.toLowerCase())) {
      setUsernameCheckStatus('taken');
      setUsernameCheckMessage('该用户名已被使用');
    } else {
      setUsernameCheckStatus('available');
      setUsernameCheckMessage('用户名可用');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await authService.login(loginForm.username, loginForm.password);
      if (res.success && res.data) {
        useAuthStore.getState().setToken(res.data.token);
        useAuthStore.getState().setUser(res.data.user);
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
    
    // 验证用户名
    const usernameValidation = validateUsername(regForm.username);
    if (!usernameValidation.valid) {
      setRegError(usernameValidation.message);
      setIsLoading(false);
      return;
    }
    
    // 检查用户名是否可用
    if (usernameCheckStatus === 'taken') {
      setRegError('该用户名已被使用，请选择其他用户名');
      setIsLoading(false);
      return;
    }
    
    if (usernameCheckStatus === 'checking') {
      setRegError('正在检查用户名，请稍候...');
      setIsLoading(false);
      return;
    }
    
    if (regForm.password.length < 6) {
      setRegError('密码长度至少 6 位');
      setIsLoading(false);
      return;
    }
    
    if (passwordStrength.score < 2) {
      setRegError('密码强度太弱，请使用更强的密码');
      setIsLoading(false);
      return;
    }
    
    if (regForm.password !== regForm.confirmPassword) {
      setRegError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }
    
    // 邮箱格式验证
    if (regForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) {
      setRegError('请输入有效的邮箱地址');
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
        useAuthStore.getState().setToken(res.data.token);
        useAuthStore.getState().setUser(res.data.user);
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
    
    // 用户名变更时触发检查
    if (field === 'username') {
      if (checkUsernameTimeout.current) {
        clearTimeout(checkUsernameTimeout.current);
      }
      if (value) {
        checkUsernameTimeout.current = setTimeout(() => {
          checkUsernameAvailability(value);
        }, 500);
      } else {
        setUsernameCheckStatus('idle');
        setUsernameCheckMessage('');
      }
    }
  };

  // 密码强度条
  const PasswordStrengthBar = () => {
    if (!regForm.password) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                passwordStrength.score >= level ? passwordStrength.bgColor : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">密码强度：</span>
          <span className={cn('text-xs font-medium', passwordStrength.color)}>
            {passwordStrength.label}
          </span>
        </div>
      </div>
    );
  };

  // 用户名状态图标
  const UsernameStatusIcon = () => {
    if (usernameCheckStatus === 'idle' || !regForm.username) return null;
    if (usernameCheckStatus === 'checking') {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (usernameCheckStatus === 'available') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (usernameCheckStatus === 'taken' || usernameCheckStatus === 'invalid') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
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
                      className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4 shrink-0" />
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
                      className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4 shrink-0" />
                      {regError}
                    </motion.div>
                  )}

                  {/* 用户名 + 实时检查 */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">
                      用户名 <span className="text-primary-400 text-xs">(3-20 字符，支持字母、数字、下划线)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-username"
                        placeholder="请输入用户名"
                        value={regForm.username}
                        onChange={(e) => updateRegField('username', e.target.value)}
                        required
                        minLength={3}
                        maxLength={20}
                        disabled={isLoading}
                        className={cn(
                          usernameCheckStatus === 'available' && 'pr-10 border-green-500',
                          usernameCheckStatus === 'taken' && 'pr-10 border-red-500',
                          usernameCheckStatus === 'invalid' && 'pr-10 border-red-500'
                        )}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <UsernameStatusIcon />
                      </div>
                    </div>
                    {usernameCheckMessage && (
                      <p className={cn(
                        'text-xs',
                        usernameCheckStatus === 'available' && 'text-green-500',
                        usernameCheckStatus === 'taken' && 'text-red-500',
                        usernameCheckStatus === 'invalid' && 'text-red-500',
                        usernameCheckStatus === 'checking' && 'text-muted-foreground'
                      )}>
                        {usernameCheckMessage}
                      </p>
                    )}
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

                  {/* 密码 + 强度指示 */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密码 <span className="text-primary-400 text-xs">(至少 6 位，建议 12 位以上)</span></Label>
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
                    <PasswordStrengthBar />
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
                      className={cn(
                        regForm.confirmPassword && regForm.password !== regForm.confirmPassword && 'border-red-500'
                      )}
                    />
                    {regForm.confirmPassword && regForm.password !== regForm.confirmPassword && (
                      <p className="text-xs text-red-500">两次输入的密码不一致</p>
                    )}
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

                  <Button type="submit" className="w-full" disabled={isLoading || usernameCheckStatus === 'taken'}>
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

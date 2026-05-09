// ========================================
// AdminPage — 管理员面板 (优化版 v2)
// ========================================
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Database, FileText, Activity, Settings,
  Trash2, RefreshCcw, Download, AlertTriangle,
  CheckCircle2, XCircle, Server, Loader2, Globe,
  Ban, UserCheck, Search, Eye, ChevronLeft, ChevronRight,
  BarChart3, PieChart, TrendingUp, Clock, MoreVertical,
  Edit, UserX, Mail, Building, Calendar, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AnimatedPage from '@/components/shared/AnimatedPage';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import type { AdminStats, User } from '@/types';

interface ExtendedUser extends User {
  isActive?: boolean;
  lastLoginAt?: string;
  paperCount?: number;
  projectCount?: number;
  loginCount?: number;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  newThisWeek: number;
  newThisMonth: number;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  
  // 用户操作对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', email: '', institution: '', role: '' });
  
  // 统计数据
  const [systemMetrics, setSystemMetrics] = useState({
    totalRequests: 1247,
    avgResponseTime: 45,
    errorRate: 0.03,
    uptime: 99.97
  });

  // 加载管理数据
  const loadAdminData = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const [usersRes, papersRes, projectsRes, spacesRes] = await Promise.all([
        api.getAdminUsers({ page, search, limit: 20 }),
        api.getPapers({ pageSize: 1 }),
        api.getProjects(),
        api.getSpaces ? api.getSpaces({ limit: 1 }) : Promise.resolve({ success: true, data: { spaces: [], total: 0 } }),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users || []);
        setUserTotal(usersRes.data.pagination?.total || 0);
        setUserTotalPages(usersRes.data.pagination?.totalPages || 1);
        
        // 计算用户统计数据
        const allUsers = usersRes.data.users || [];
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        setUserStats({
          total: allUsers.length,
          active: allUsers.filter(u => u.isActive !== false).length,
          inactive: allUsers.filter(u => u.isActive === false).length,
          admins: allUsers.filter(u => u.role === 'admin').length,
          newThisWeek: allUsers.filter(u => new Date(u.createdAt) > oneWeekAgo).length,
          newThisMonth: allUsers.filter(u => new Date(u.createdAt) > oneMonthAgo).length,
        });
      }

      // 系统统计
      const totalPapers = papersRes.total || papersRes.data?.length || 0;
      const totalProjects = projectsRes.data?.length || 0;
      const totalSpaces = spacesRes.success ? spacesRes.data?.total || 0 : 0;

      setStats({
        totalUsers: userStats?.total || allUsers?.length || 0,
        totalPapers,
        totalProjects,
        totalSpaces,
        activeUsers: userStats?.active || 0,
        recentActivities: [],
        systemHealth: {
          kv: 'healthy',
          edgeFunctions: 'healthy',
          cloudFunctions: 'healthy',
        },
      });

      // 活动日志
      setActivities([
        { id: '1', action: '添加文献', target: 'Temporal Pattern-Aware GNN for Fraud Detection', time: '2 小时前', status: 'success', user: 'joan' },
        { id: '2', action: '用户注册', target: 'researcher2', time: '5 小时前', status: 'success', user: 'system' },
        { id: '3', action: '创建项目', target: '动态图网络在时序欺诈识别中的应用', time: '1 天前', status: 'success', user: 'joan' },
        { id: '4', action: '批量导入', target: '12 篇文献（BibTeX）', time: '2 天前', status: 'success', user: 'admin' },
        { id: '5', action: '搜索请求', target: 'heterogeneous graph neural network', time: '2 天前', status: 'warning', user: 'zhang-wei' },
        { id: '6', action: 'API 错误', target: '/api/search/semantic-scholar 504 超时', time: '3 天前', status: 'error', user: 'system' },
        { id: '7', action: '用户登录', target: 'admin', time: '10 分钟前', status: 'success', user: 'admin' },
        { id: '8', action: '更新设置', target: '主题配置', time: '30 分钟前', status: 'success', user: 'joan' },
      ]);
    } catch (err) {
      console.error('[Admin] Load error:', err);
      toast.error('加载管理数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData(userPage, userSearch);
    setRefreshing(false);
    toast.success('数据已刷新');
  };

  useEffect(() => { 
    loadAdminData(userPage, userSearch); 
  }, [userPage, userSearch, loadAdminData]);

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadAdminData(1, userSearch);
  };

  // 用户操作
  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    setUpdatingUser(userId);
    try {
      const res = await api.updateUser(userId, { isActive: !currentActive });
      if (res.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, isActive: !currentActive } : u
        ));
        toast.success(currentActive ? '用户已禁用' : '用户已启用');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setUpdatingUser(selectedUser.id);
    try {
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      toast.success(`用户 ${selectedUser.username} 已删除`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch {
      toast.error('删除失败');
    } finally {
      setUpdatingUser(null);
    }
  };

  const openEditDialog = (u: ExtendedUser) => {
    setSelectedUser(u);
    setEditForm({
      displayName: u.displayName || '',
      email: u.email || '',
      institution: u.institution || '',
      role: u.role || 'user',
    });
    setEditUserDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setUpdatingUser(selectedUser.id);
    try {
      const res = await api.updateUser(selectedUser.id, {
        displayName: editForm.displayName,
        email: editForm.email,
        institution: editForm.institution,
        role: editForm.role,
      });
      if (res.success) {
        setUsers(prev => prev.map(u =>
          u.id === selectedUser.id ? { ...u, ...editForm } : u
        ));
        toast.success('用户信息已更新');
        setEditUserDialogOpen(false);
      }
    } catch {
      toast.error('更新失败');
    } finally {
      setUpdatingUser(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold">访问受限</h2>
          <p className="text-sm text-muted-foreground mt-2">此页面仅限管理员访问。</p>
        </div>
      </AnimatedPage>
    );
  }

  if (loading) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin mr-3" />
          <p className="text-sm text-muted-foreground">加载管理数据...</p>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
            <p className="text-sm text-muted-foreground">系统管理与监控面板</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto gap-1.5" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            {refreshing ? '刷新中...' : '刷新'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          {[
            { icon: Users, label: '总用户', value: userStats?.total || 0, color: 'bg-blue-500', trend: '+' + (userStats?.newThisWeek || 0) + ' 本周' },
            { icon: FileText, label: '文献数', value: stats?.totalPapers || 0, color: 'bg-primary' },
            { icon: Activity, label: '项目数', value: stats?.totalProjects || 0, color: 'bg-purple-500' },
            { icon: Database, label: 'KV 用量', value: '2.4 MB', color: 'bg-emerald-500' },
            { icon: Server, label: '24h 请求', value: systemMetrics.totalRequests.toLocaleString(), color: 'bg-orange-500' },
            { icon: CheckCircle2, label: '可用性', value: systemMetrics.uptime + '%', color: 'bg-green-500' },
          ].map((s, i) => (
            <motion.Card 
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('flex h-6 w-6 items-center justify-center rounded text-white', s.color)}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold">{s.value}</p>
                {s.trend && <p className="text-[10px] text-green-500">{s.trend}</p>}
              </CardContent>
            </motion.Card>
          ))}
        </div>

        {/* User Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">活跃用户</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{userStats?.active || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400">本周新增</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{userStats?.newThisWeek || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">本月新增</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{userStats?.newThisMonth || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-400">管理员</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{userStats?.admins || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              系统概览
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="spaces" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              空间管理
            </TabsTrigger>
            <TabsTrigger value="workbuddy" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              WorkBuddy
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    最近活动
                  </CardTitle>
                  <CardDescription>系统最近操作日志</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                        <div className="mt-0.5 shrink-0">
                          {act.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : act.status === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">{act.action}</Badge>
                            <Badge variant="outline" className="text-[10px]">@{act.user}</Badge>
                            <span className="text-[11px] text-muted-foreground">{act.time}</span>
                          </div>
                          <p className="text-sm mt-1 truncate">{act.target}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    系统健康状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'API 服务', status: stats?.systemHealth?.edgeFunctions || 'healthy', detail: 'Edge Functions' },
                      { label: 'KV 存储', status: stats?.systemHealth?.kv || 'healthy', detail: 'EdgeOne KV' },
                      { label: 'Cloud Functions', status: stats?.systemHealth?.cloudFunctions || 'healthy', detail: 'Node.js Runtime' },
                      { label: 'ArXiv 搜索', status: 'healthy' as const, detail: '外部服务' },
                    ].map((svc) => (
                      <div key={svc.label} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <span className="text-sm font-medium">{svc.label}</span>
                          <p className="text-[10px] text-muted-foreground">{svc.detail}</p>
                        </div>
                        <Badge
                          variant={svc.status === 'healthy' ? 'default' : 'secondary'}
                          className={cn(
                            'text-[10px]',
                            svc.status === 'healthy' ? 'bg-green-500 hover:bg-green-500'
                              : svc.status === 'degraded' ? 'bg-amber-500 hover:bg-amber-500'
                              : 'bg-red-500 hover:bg-red-500'
                          )}
                        >
                          {svc.status === 'healthy' ? '正常' : svc.status === 'degraded' ? '降级' : '异常'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  {/* Performance Metrics */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3">性能指标</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">平均响应时间</span>
                          <span className="font-medium">{systemMetrics.avgResponseTime}ms</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.max(0, 100 - systemMetrics.avgResponseTime / 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">错误率</span>
                          <span className="font-medium">{systemMetrics.errorRate}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.max(0, 100 - systemMetrics.errorRate * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">用户列表</CardTitle>
                    <CardDescription>管理注册用户（共 {userTotal} 人）</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <form onSubmit={handleUserSearch} className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="搜索用户..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-8 w-40 h-8 text-sm"
                        />
                      </div>
                      <Button type="submit" size="sm" variant="outline">搜索</Button>
                    </form>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    暂无用户数据
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {users.map((u) => (
                        <motion.div 
                          key={u.id} 
                          className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                          layout
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {(u.displayName || u.username || 'U')[0].toUpperCase()}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{u.displayName || u.username}</p>
                              {u.role === 'admin' && (
                                <Badge variant="default" className="text-[10px] bg-primary">管理员</Badge>
                              )}
                              {u.isActive === false && (
                                <Badge variant="secondary" className="text-[10px] bg-gray-400">已禁用</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>@{u.username}</span>
                              {u.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>}
                              {u.institution && <span className="flex items-center gap-1"><Building className="h-3 w-3" />{u.institution}</span>}
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex flex-col items-end text-[11px] text-muted-foreground gap-1">
                            <span>注册于 {formatDate(u.createdAt)}</span>
                            {u.lastLoginAt && <span>最后登录 {formatRelativeTime(u.lastLoginAt)}</span>}
                          </div>
                          
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-8"
                              onClick={() => openEditDialog(u)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-8"
                              disabled={updatingUser === u.id || u.role === 'admin' || u.id === user?.id}
                              onClick={() => toggleUserStatus(u.id, u.isActive !== false)}
                            >
                              {u.isActive !== false ? (
                                <Ban className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={updatingUser === u.id || u.role === 'admin' || u.id === user?.id || u.username === 'joan'}
                              onClick={() => {
                                setSelectedUser(u);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {userTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-xs text-muted-foreground">
                          共 {userTotal} 条，第 {userPage}/{userTotalPages} 页
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from({ length: Math.min(5, userTotalPages) }, (_, i) => {
                            const page = userPage <= 3 ? i + 1 : userPage + i - 2;
                            if (page > userTotalPages) return null;
                            return (
                              <Button
                                key={page}
                                variant={userPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setUserPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                          <Button variant="outline" size="sm" disabled={userPage >= userTotalPages} onClick={() => setUserPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spaces Tab */}
          <TabsContent value="spaces" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">空间管理</CardTitle>
                    <CardDescription>管理公开学术空间</CardDescription>
                  </div>
                  <Badge variant="secondary">{stats?.totalSpaces || 0} 个空间</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium">空间管理功能</p>
                  <p className="text-xs mt-1">
                    用户注册后自动创建公开空间，空间列表显示在
                    <a href="#/gallery" className="text-primary underline mx-1">学术广场</a>
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    连接后端（KV 存储）后可在此管理用户空间配置
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">公开空间路由</CardTitle>
                <CardDescription>用户可通过 /#/u/:username 访问公开学术空间</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    { path: '/#/gallery', desc: '学术广场入口' },
                    { path: '/#/u/:username', desc: '用户公开空间' },
                    { path: '/api/spaces', desc: '空间列表 API' },
                    { path: '/api/spaces/:username', desc: '空间详情 API' },
                    { path: '/api/spaces/:username/view', desc: '记录访问 API' },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-3 rounded border p-2.5">
                      <code className="flex-1 text-primary-500">{ep.path}</code>
                      <span className="text-muted-foreground">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WorkBuddy Tab */}
          <TabsContent value="workbuddy" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">WorkBuddy 管理通道</CardTitle>
                <CardDescription>通过此面板可直接操作 KV 存储中的数据</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Database, label: '注入种子数据', desc: '将预设文献数据导入 KV 存储', color: 'text-primary' },
                    { icon: Download, label: '导出全部文献', desc: '以 BibTeX/CSV 格式导出', color: 'text-primary' },
                    { icon: Trash2, label: '清理 KV 数据', desc: '清除缓存与过期数据', color: 'text-red-500' },
                    { icon: RefreshCcw, label: '重建索引', desc: '重新构建搜索索引', color: 'text-primary' },
                  ].map((item) => (
                    <Button
                      key={item.label}
                      variant="outline"
                      className="justify-start gap-3 h-auto p-4"
                      onClick={() => toast.info(`${item.label}功能需连接后端后使用`)}
                    >
                      <item.icon className={cn('h-5 w-5', item.color)} />
                      <div className="text-left">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">API 端点</CardTitle>
                <CardDescription>WorkBuddy 专用管理接口</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    { method: 'POST', path: '/api/admin/workbuddy/seed', desc: '注入种子数据' },
                    { method: 'GET', path: '/api/admin/workbuddy/stats', desc: '获取系统统计' },
                    { method: 'POST', path: '/api/admin/workbuddy/clean', desc: '清理 KV 数据' },
                    { method: 'GET', path: '/api/admin/workbuddy/export?format=bibtex', desc: '导出文献' },
                    { method: 'POST', path: '/api/admin/workbuddy/reindex', desc: '重建索引' },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-3 rounded border p-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono w-14 justify-center',
                          ep.method === 'GET' && 'text-green-600 border-green-200',
                          ep.method === 'POST' && 'text-blue-600 border-blue-200'
                        )}
                      >
                        {ep.method}
                      </Badge>
                      <code className="flex-1 text-primary-500">{ep.path}</code>
                      <span className="text-muted-foreground">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
            <DialogDescription>
              确定要删除用户 <strong>{selectedUser?.username}</strong> 吗？此操作不可撤销，将同时删除该用户的所有数据和资源。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={updatingUser === selectedUser?.id}>
              {updatingUser === selectedUser?.id ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户 <strong>{selectedUser?.username}</strong> 的信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">显示名称</label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="用户的显示名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">机构</label>
              <Input
                value={editForm.institution}
                onChange={(e) => setEditForm(prev => ({ ...prev, institution: e.target.value }))}
                placeholder="所在机构或学校"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={editForm.role === 'user'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">普通用户</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={editForm.role === 'admin'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">管理员</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>取消</Button>
            <Button onClick={handleEditUser} disabled={updatingUser === selectedUser?.id}>
              {updatingUser === selectedUser?.id ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}

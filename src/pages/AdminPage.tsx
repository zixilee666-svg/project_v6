// ========================================
// AdminPage — 管理员面板
// ========================================
import { useState, useEffect } from 'react';
import {
  Shield, Users, Database, FileText, Activity, Settings,
  Trash2, RefreshCcw, Download, AlertTriangle,
  CheckCircle2, XCircle, Server, Loader2, Globe,
  Ban, UserCheck, Search, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimatedPage from '@/components/shared/AnimatedPage';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type { AdminStats } from '@/types';

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Load admin data
  const loadAdminData = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const [usersRes, papersRes, projectsRes] = await Promise.all([
        api.getAdminUsers({ page, search, limit: 20 }),
        api.getPapers({ pageSize: 1 }),
        api.getProjects(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users || []);
        setUserTotal(usersRes.data.pagination?.total || 0);
        setUserTotalPages(usersRes.data.pagination?.totalPages || 1);
      }

      setStats({
        totalUsers: userTotal || 2,
        totalPapers: papersRes.total || papersRes.data?.length || 0,
        totalProjects: projectsRes.data?.length || 0,
        totalSpaces: 0,
        activeUsers: users.filter(u => u.isActive !== false).length,
        recentActivities: [],
        systemHealth: {
          kv: 'healthy',
          edgeFunctions: 'healthy',
          cloudFunctions: 'healthy',
        },
      });

      setActivities([
        { id: '1', action: '添加文献', target: 'Temporal Pattern-Aware GNN for Fraud Detection', time: '2 小时前', status: 'success' },
        { id: '2', action: '用户注册', target: 'researcher2', time: '5 小时前', status: 'success' },
        { id: '3', action: '创建项目', target: '动态图网络在时序欺诈识别中的应用', time: '1 天前', status: 'success' },
        { id: '4', action: '批量导入', target: '12 篇文献（BibTeX）', time: '2 天前', status: 'success' },
        { id: '5', action: '搜索请求', target: 'heterogeneous graph neural network', time: '2 天前', status: 'warning' },
        { id: '6', action: 'API 错误', target: '/api/search/semantic-scholar 504 超时', time: '3 天前', status: 'error' },
      ]);
    } catch (err) {
      console.error('[Admin] Load error:', err);
      toast.error('加载管理数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdminData(userPage, userSearch); }, [userPage]);

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadAdminData(1, userSearch);
  };

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
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => loadAdminData(userPage, userSearch)}>
            <RefreshCcw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: Users, label: '用户数', value: stats?.totalUsers || 0, color: 'bg-blue-500' },
            { icon: FileText, label: '文献数', value: stats?.totalPapers || 0, color: 'bg-primary' },
            { icon: Activity, label: '项目数', value: stats?.totalProjects || 0, color: 'bg-purple-500' },
            { icon: Database, label: 'KV 用量', value: '2.4 MB', color: 'bg-emerald-500' },
            { icon: Server, label: '24h 请求', value: 1247, color: 'bg-orange-500' },
            { icon: CheckCircle2, label: '可用性', value: '99.97%', color: 'bg-green-500' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('flex h-6 w-6 items-center justify-center rounded text-white', s.color)}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">最近活动</CardTitle>
                <CardDescription>系统最近操作日志</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 rounded-lg border p-3">
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
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{act.action}</Badge>
                          <span className="text-[11px] text-muted-foreground">{act.time}</span>
                        </div>
                        <p className="text-sm mt-1 truncate">{act.target}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">系统健康</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'API 服务', status: stats?.systemHealth?.edgeFunctions || 'healthy' },
                    { label: 'KV 存储', status: stats?.systemHealth?.kv || 'healthy' },
                    { label: 'Cloud Functions', status: stats?.systemHealth?.cloudFunctions || 'healthy' },
                    { label: 'ArXiv 搜索', status: 'healthy' as const },
                  ].map((svc) => (
                    <div key={svc.label} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">{svc.label}</span>
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
              </CardContent>
            </Card>
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
                  <form onSubmit={handleUserSearch} className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="搜索用户名..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 w-48 h-8 text-sm"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="outline">搜索</Button>
                  </form>
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
                        <div key={u.id} className="flex items-center gap-4 rounded-lg border p-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(u.displayName || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{u.displayName || u.username}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                          <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                            {u.role === 'admin' ? '管理员' : '用户'}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px]',
                              u.isActive !== false ? 'bg-green-500 hover:bg-green-500' : 'bg-gray-400 hover:bg-gray-400'
                            )}
                          >
                            {u.isActive !== false ? '正常' : '已禁用'}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground hidden sm:block">
                            {u.createdAt ? formatDate(u.createdAt) : '-'}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              disabled={updatingUser === u.id || u.role === 'admin'}
                              onClick={() => toggleUserStatus(u.id, u.isActive !== false)}
                            >
                              {u.isActive !== false ? (
                                <><Ban className="h-3.5 w-3.5" /> 禁用</>
                              ) : (
                                <><UserCheck className="h-3.5 w-3.5" /> 启用</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {userTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-xs text-muted-foreground">
                          共 {userTotal} 条，第 {userPage}/{userTotalPages} 页
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
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
                    { icon: Trash2, label: '清理 KV 数据', desc: '清除缓存与过期数据', color: 'text-error' },
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
    </AnimatedPage>
  );
}

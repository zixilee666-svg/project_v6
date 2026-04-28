// ========================================
// AdminPage — 管理员面板 (已迁移到 API 服务层)
// ========================================
import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Users, Database, FileText, Activity, Settings,
  Trash2, RefreshCcw, Plus, Download, AlertTriangle,
  CheckCircle2, XCircle, Clock, Server, Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimatedPage from '@/components/shared/AnimatedPage';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AdminStats } from '@/types';

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Load admin data on mount
  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      try {
        // Load stats
        const papersRes = await api.getPapers({ pageSize: 1 });
        const projectsRes = await api.getProjects();
        const totalPapers = papersRes.total || 0;
        const totalProjects = projectsRes.data?.length || 0;

        // Build admin stats (some data comes from mock/API)
        setStats({
          totalUsers: 3,
          totalPapers,
          totalProjects,
          totalSpaces: 0,
          activeUsers: 2,
          recentActivities: [],
          systemHealth: {
            kv: 'healthy',
            edgeFunctions: 'healthy',
            cloudFunctions: 'healthy',
          },
        });

        setUsers([
          { id: 'admin-fixed', username: 'admin', displayName: '管理员', role: 'admin', createdAt: '2026-01-10', status: 'active' },
          { id: 'user-1', username: 'researcher1', displayName: '研究员 A', role: 'user', createdAt: '2026-02-15', status: 'active' },
          { id: 'user-2', username: 'researcher2', displayName: '研究员 B', role: 'user', createdAt: '2026-03-20', status: 'active' },
        ]);

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
    loadAdminData();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold">访问受限</h2>
          <p className="text-sm text-muted-foreground mt-2">
            此页面仅限管理员访问。
          </p>
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
            <p className="text-sm text-muted-foreground">
              系统管理与监控面板
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => window.location.reload()}>
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
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              系统概览
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              用户管理
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
                    <div
                      key={act.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
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
                          <Badge variant="secondary" className="text-[10px]">
                            {act.action}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {act.time}
                          </span>
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
                    <div
                      key={svc.label}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">{svc.label}</span>
                      <Badge
                        variant={svc.status === 'healthy' ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px]',
                          svc.status === 'healthy'
                            ? 'bg-green-500 hover:bg-green-500'
                            : svc.status === 'degraded'
                            ? 'bg-amber-500 hover:bg-amber-500'
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">用户列表</CardTitle>
                    <CardDescription>管理注册用户</CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    添加用户
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 rounded-lg border p-4"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(u.displayName || u.username)[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className={cn(
                        'text-[10px]',
                        u.status === 'active' ? 'bg-green-500 hover:bg-green-500' : 'bg-gray-400 hover:bg-gray-400'
                      )}>
                        {u.status === 'active' ? '正常' : '禁用'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground hidden sm:block">
                        {u.createdAt}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
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
                <CardDescription>
                  通过此面板可直接操作 KV 存储中的数据，适用于 WorkBuddy 脚本化管理
                </CardDescription>
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

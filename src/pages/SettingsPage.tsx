// ========================================
// SettingsPage — 用户设置
// ========================================
import { useState } from 'react';
import {
  User, Palette, Quote, Bell, Shield, Info, Moon, Sun, Monitor,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimatedPage from '@/components/shared/AnimatedPage';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings, SettingsProvider } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import type { ThemeMode, CitationFormat } from '@/types';

function SettingsContent() {
  const { user } = useAuth();
  const { mode, setMode } = useTheme();
  const settings = useSettings();

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'light', label: '浅色', icon: Sun, desc: '明亮的象牙白主题' },
    { value: 'dark', label: '深色', icon: Moon, desc: '深邃的墨蓝色主题' },
    { value: 'system', label: '跟随系统', icon: Monitor, desc: '自动适配系统设置' },
  ];

  const citationOptions: { value: CitationFormat; label: string; desc: string }[] = [
    { value: 'bibtex', label: 'BibTeX', desc: '计算机科学常用' },
    { value: 'ieee', label: 'IEEE', desc: '工程与技术领域' },
    { value: 'gb7714', label: 'GB/T 7714-2015', desc: '中国国家标准' },
  ];

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-sm text-muted-foreground">管理个人偏好与账户设置</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              外观
            </TabsTrigger>
            <TabsTrigger value="citations" className="gap-1.5">
              <Quote className="h-3.5 w-3.5" />
              引用格式
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              通知
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />
              关于
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">个人信息</CardTitle>
                <CardDescription>管理你的公开资料信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                    {(user?.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.displayName || '未设置'}</p>
                    <p className="text-sm text-muted-foreground">@{user?.username}</p>
                    <Badge variant="secondary" className="mt-1">
                      {user?.role === 'admin' ? '管理员' : '研究者'}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>用户名</Label>
                    <Input defaultValue={user?.username || ''} disabled className="mt-1.5" />
                    <p className="text-[11px] text-muted-foreground mt-1">用户名不可修改</p>
                  </div>
                  <div>
                    <Label>显示名称</Label>
                    <Input defaultValue={user?.displayName || ''} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>所属机构</Label>
                    <Input defaultValue={user?.institution || ''} placeholder="如：清华大学" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>研究领域</Label>
                    <Input defaultValue={user?.researchField || ''} placeholder="如：图神经网络" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => toast.success('个人资料已保存')}>
                    保存修改
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  安全设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>修改密码</Label>
                  <Input type="password" placeholder="输入当前密码" className="mt-1.5" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>新密码</Label>
                    <Input type="password" placeholder="输入新密码" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>确认新密码</Label>
                    <Input type="password" placeholder="再次输入新密码" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => toast.success('密码已修改')}>
                    更新密码
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">主题设置</CardTitle>
                <CardDescription>选择你偏好的视觉主题</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setMode(opt.value);
                        settings.setTheme(opt.value);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-lg border-2 p-5 transition-all',
                        mode === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-primary/30'
                      )}
                    >
                      <div
                        className={cn(
                          'h-12 w-12 rounded-full flex items-center justify-center',
                          mode === opt.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <opt.icon className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                      </div>
                      {mode === opt.value && (
                        <Badge variant="default" className="text-[10px]">
                          当前
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Citations Tab */}
          <TabsContent value="citations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">默认引用格式</CardTitle>
                <CardDescription>
                  设置文献详情页复制引用时的默认格式
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {citationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => settings.setCitationFormat(opt.value)}
                      className={cn(
                        'flex items-center gap-4 rounded-lg border-2 p-4 transition-all w-full text-left',
                        settings.citationFormat === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-primary/30'
                      )}
                    >
                      <div
                        className={cn(
                          'h-3 w-3 rounded-full shrink-0',
                          settings.citationFormat === opt.value
                            ? 'bg-primary ring-2 ring-primary/30'
                            : 'bg-muted-foreground/30'
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">通知偏好</CardTitle>
                <CardDescription>选择你希望接收的通知类型</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: 'newPapers' as const,
                    label: '新论文推荐',
                    desc: '当有与你研究兴趣相关的论文发布时通知',
                  },
                  {
                    key: 'readingReminders' as const,
                    label: '阅读提醒',
                    desc: '每日阅读提醒，帮助你保持阅读习惯',
                  },
                  {
                    key: 'projectUpdates' as const,
                    label: '项目动态',
                    desc: '研究项目有新更新时通知',
                  },
                  {
                    key: 'pointsChange' as const,
                    label: '积分变化',
                    desc: '学术积分增减时通知',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={settings.notifications[item.key]}
                      onCheckedChange={(v) => settings.setNotification(item.key, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  Joan&apos;s Academic Hub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <span className="text-3xl">⚖️</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold">Joan&apos;s Academic Hub</h3>
                  <p className="text-sm text-muted-foreground mt-1">v1.0.0</p>
                  <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                    以圣洁纯粹之心，行理性严谨之事。学术文献管理平台，为研究者的求知之路执灯。
                  </p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>前端</span>
                    <span className="font-mono text-xs">React 19 + TypeScript + Vite</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UI 框架</span>
                    <span className="font-mono text-xs">Tailwind CSS + shadcn/ui</span>
                  </div>
                  <div className="flex justify-between">
                    <span>后端</span>
                    <span className="font-mono text-xs">EdgeOne Cloud Functions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>存储</span>
                    <span className="font-mono text-xs">EdgeOne KV</span>
                  </div>
                  <div className="flex justify-between">
                    <span>部署</span>
                    <span className="font-mono text-xs">EdgeOne Pages</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">重置设置</CardTitle>
                <CardDescription>将所有设置恢复为默认值</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="gap-2 text-error hover:bg-error/10 hover:text-error"
                  onClick={() => {
                    settings.resetSettings();
                    setMode('system');
                    toast.success('设置已重置为默认值');
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  重置所有设置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedPage>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}

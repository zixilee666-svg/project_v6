// ========================================
// ResearchPage — 研究项目管理
// ========================================
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FlaskConical, BookOpen, Clock, Target, ChevronRight,
  CheckCircle2, Circle, MoreHorizontal, Trash2, Edit3, FolderOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import AnimatedPage from '@/components/shared/AnimatedPage';
import EmptyState from '@/components/shared/EmptyState';
import JoanQuote from '@/components/shared/JoanQuote';
import { seedPapers } from '@/data/papers';
import { seedProjects } from '@/data/projects';
import type { Project, Objective } from '@/types';
import { cn, formatDate } from '@/lib/utils';

type ProjectStatus = Project['status'];

export default function ResearchPage() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return projects;
    return projects.filter((p) => p.status === filterStatus);
  }, [projects, filterStatus]);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; color: string }> = {
    'in-progress': { label: '进行中', variant: 'default', color: 'bg-primary' },
    'active': { label: '进行中', variant: 'default', color: 'bg-primary' },
    'completed': { label: '已完成', variant: 'secondary', color: 'bg-green-500' },
    'planned': { label: '计划中', variant: 'outline', color: 'bg-muted-foreground' },
  };

  const toggleObjective = (projectId: string, objectiveId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const objs = p.objectives || [];
        const newObjectives = objs.map((o) =>
          o.id === objectiveId ? { ...o, completed: !o.completed } : o
        );
        const completed = newObjectives.filter((o) => o.completed).length;
        return {
          ...p,
          objectives: newObjectives,
          progress: newObjectives.length ? Math.round((completed / newObjectives.length) * 100) : 0,
          status: completed === newObjectives.length && newObjectives.length > 0 ? 'completed' : 'in-progress',
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addObjective = (projectId: string, text: string) => {
    if (!text.trim()) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          objectives: [
            ...(p.objectives || []),
            { id: Date.now().toString(36), text: text.trim(), completed: false },
          ],
        };
      })
    );
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    toast.success('项目已删除');
  };

  const createProject = () => {
    if (!newTitle.trim()) return;
    const project: Project = {
      id: Date.now().toString(36),
      title: newTitle.trim(),
      description: newDesc.trim(),
      progress: 0,
      status: 'planned',
      relatedPaperIds: [],
      objectives: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [project, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setCreateOpen(false);
    toast.success('项目已创建');
  };

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === 'in-progress').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const planned = projects.filter((p) => p.status === 'planned').length;
    return { total, inProgress, completed, planned };
  }, [projects]);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">我的研究</h1>
            <p className="text-sm text-muted-foreground">
              管理研究项目，追踪目标进度
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新建项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建研究项目</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>项目名称</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="输入项目名称..."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>项目描述</Label>
                  <Textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="描述研究目标与范围..."
                    className="mt-1.5"
                    rows={4}
                  />
                </div>
                <Button onClick={createProject} className="w-full" disabled={!newTitle.trim()}>
                  创建项目
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: '总项目', value: stats.total, color: 'text-primary' },
            { label: '进行中', value: stats.inProgress, color: 'text-blue-500' },
            { label: '已完成', value: stats.completed, color: 'text-green-500' },
            { label: '计划中', value: stats.planned, color: 'text-muted-foreground' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(['all', 'in-progress', 'completed', 'planned'] as const).map((s) => (
            <Badge
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? '全部' : statusConfig[s].label}
            </Badge>
          ))}
        </div>

        {/* Projects */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-8 w-8" />}
            title="暂无研究项目"
            description="创建你的第一个研究项目，开始组织文献与目标。"
            action={
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                新建项目
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden">
                  {/* Project Header */}
                  <CardContent
                    className="pt-5 pb-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setExpandedProject(expandedProject === project.id ? null : project.id)
                    }
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold">{project.title || project.name || '未命名项目'}</h3>
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={statusConfig[project.status].variant}>
                              {statusConfig[project.status].label}
                            </Badge>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                expandedProject === project.id && 'rotate-90'
                              )}
                            />
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {(project.objectives || []).filter((o) => o.completed).length}/{(project.objectives || []).length} 目标
                            </span>
                            <span className="font-medium">{project.progress || 0}%</span>
                          </div>
                          <Progress value={project.progress || 0} className="h-1.5" />
                        </div>

                        {/* Meta */}
                        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {(project.relatedPaperIds || project.paperIds || []).length} 篇文献
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            更新于 {formatDate(project.updatedAt || '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {expandedProject === project.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <Separator />
                        <div className="p-5 space-y-4">
                          {/* Joan Quote */}
                          <JoanQuote category="academic" />

                          {/* Objectives */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              研究目标
                            </h4>
                            <div className="space-y-2">
                              {(project.objectives || []).map((obj) => (
                                <div
                                  key={obj.id}
                                  className="flex items-center gap-3 group"
                                >
                                  <button
                                    onClick={() => toggleObjective(project.id, obj.id)}
                                    className="shrink-0"
                                  >
                                    {obj.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                  <span
                                    className={cn(
                                      'text-sm flex-1',
                                      obj.completed && 'line-through text-muted-foreground'
                                    )}
                                  >
                                    {obj.text}
                                  </span>
                                </div>
                              ))}
                              {(project.objectives || []).length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  暂无目标，在下方输入框添加。
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Related Papers */}
                          {(project.relatedPaperIds || project.paperIds || []).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                关联文献 ({(project.relatedPaperIds || project.paperIds || []).length})
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(project.relatedPaperIds || project.paperIds || []).map((pid) => {
                                  const paper = seedPapers.find((p) => p.id === pid);
                                  if (!paper) return null;
                                  return (
                                    <Link
                                      key={pid}
                                      to={`/paper/${pid}`}
                                      className="group flex items-start gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors"
                                    >
                                      <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                                      <div className="min-w-0">
                                        <p className="line-clamp-1 text-xs font-medium group-hover:text-primary transition-colors">
                                          {paper.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {paper.year} · {paper.venue}
                                        </p>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {project.notes && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">研究笔记</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-3">
                                {project.notes}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-error hover:bg-error/10 hover:text-error"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              删除项目
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}

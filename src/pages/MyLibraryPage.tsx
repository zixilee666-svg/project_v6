// ========================================
// MyLibraryPage — 文献库管理页面
// 支持：增/删/改名文献库、论文分配到库、拖拽排序
// ========================================
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Plus, FolderOpen, Folder, Edit2, Trash2,
  ChevronRight, BookOpen, X, Check, FolderPlus,
  GripVertical, MoreHorizontal, Star, ExternalLink,
  Library as LibraryIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AnimatedPage from '@/components/shared/AnimatedPage';
import EmptyState from '@/components/shared/EmptyState';
import { api } from '@/lib/api';
import type { Library, Paper } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

// 预设颜色
const LIBRARY_COLORS = [
  '#3d5a80', '#C9A96E', '#2D8A4E', '#B91C1C',
  '#7C3AED', '#0891B2', '#D97706', '#DB2777',
];

// 预设图标
const LIBRARY_ICONS = [
  'Folder', 'BookOpen', 'Network', 'GitBranch',
  'ShieldAlert', 'FlaskConical', 'FileText', 'Star',
];

export default function MyLibraryPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('lib-all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [libForm, setLibForm] = useState({ name: '', description: '', color: '#3d5a80', icon: 'Folder' });
  const [libNameError, setLibNameError] = useState('');

  // Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLibrary, setDeletingLibrary] = useState<Library | null>(null);

  // Move paper dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingPaper, setMovingPaper] = useState<Paper | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ library: Library; x: number; y: number } | null>(null);

  // Load libraries and papers
  const loadLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const [libRes, paperRes] = await Promise.all([
        api.getLibraries(),
        api.getPapers({ pageSize: 200 }),
      ]);
      if (paperRes.success && paperRes.data) {
        setAllPapers(paperRes.data);
      }
      if (libRes.success && libRes.data) {
        setLibraries(libRes.data);
        if (!selectedLibraryId || !libRes.data.find(l => l.id === selectedLibraryId)) {
          setSelectedLibraryId(libRes.data[0]?.id || 'lib-all');
        }
      }
    } catch {
      // Fallback: empty state
      setLibraries([{
        id: 'lib-all', name: '全部文献', color: '#3d5a80',
        icon: 'Library', paperIds: [],
        createdAt: new Date().toISOString(), isDefault: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [selectedLibraryId]);

  useEffect(() => { loadLibraries(); }, [loadLibraries]);

  // Selected library
  const selectedLibrary = useMemo(
    () => libraries.find(l => l.id === selectedLibraryId) || libraries[0],
    [libraries, selectedLibraryId]
  );

  // Papers in selected library
  const libraryPapers = useMemo(() => {
    const lib = selectedLibrary;
    if (!lib) return [];
    if (lib.id === 'lib-all') return allPapers;
    const libPaperIds = new Set(lib.paperIds);
    return allPapers.filter(p => libPaperIds.has(p.id));
  }, [selectedLibrary, allPapers]);

  // Filter papers by search
  const filteredPapers = useMemo(() => {
    if (!search.trim()) return libraryPapers;
    const q = search.toLowerCase();
    return libraryPapers.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.authors.some(a => a.toLowerCase().includes(q)) ||
      p.venue.toLowerCase().includes(q)
    );
  }, [libraryPapers, search]);

  // Open create dialog
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingLibrary(null);
    setLibForm({ name: '', description: '', color: '#3d5a80', icon: 'Folder' });
    setLibNameError('');
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (lib: Library) => {
    setDialogMode('edit');
    setEditingLibrary(lib);
    setLibForm({
      name: lib.name,
      description: lib.description || '',
      color: lib.color,
      icon: lib.icon,
    });
    setLibNameError('');
    setDialogOpen(true);
    setContextMenu(null);
  };

  // Save library (create or update)
  const saveLibrary = async () => {
    if (!libForm.name.trim()) {
      setLibNameError('文献库名称不能为空');
      return;
    }
    try {
      if (dialogMode === 'create') {
        const res = await api.createLibrary({
          name: libForm.name.trim(),
          description: libForm.description.trim(),
          color: libForm.color,
          icon: libForm.icon,
        });
        if (res.success && res.data) {
          setLibraries(prev => [...prev, res.data]);
          setSelectedLibraryId(res.data.id);
          toast.success(`文献库「${res.data.name}」创建成功`);
        }
      } else if (editingLibrary) {
        const res = await api.updateLibrary(editingLibrary.id, {
          name: libForm.name.trim(),
          description: libForm.description.trim(),
          color: libForm.color,
          icon: libForm.icon,
        });
        if (res.success && res.data) {
          setLibraries(prev => prev.map(l => l.id === res.data.id ? res.data : l));
          toast.success(`文献库「${res.data.name}」已更新`);
        }
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  // Delete library
  const confirmDelete = async () => {
    if (!deletingLibrary) return;
    try {
      await api.deleteLibrary(deletingLibrary.id);
      setLibraries(prev => prev.filter(l => l.id !== deletingLibrary.id));
      if (selectedLibraryId === deletingLibrary.id) {
        setSelectedLibraryId('lib-all');
      }
      toast.success(`文献库「${deletingLibrary.name}」已删除`);
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingLibrary(null);
    }
  };

  // Move paper to another library
  const movePaper = async (targetLibId: string) => {
    if (!movingPaper) return;
    try {
      const targetLib = libraries.find(l => l.id === targetLibId);
      if (!targetLib) return;
      if (!targetLib.paperIds.includes(movingPaper.id)) {
        await api.addPaperToLibrary(targetLibId, movingPaper.id);
      }
      setLibraries(prev => prev.map(l => {
        if (l.id === targetLibId && !l.paperIds.includes(movingPaper.id)) {
          return { ...l, paperIds: [...l.paperIds, movingPaper.id] };
        }
        return l;
      }));
      toast.success(`已移动到「${targetLib.name}」`);
      setMoveDialogOpen(false);
      setMovingPaper(null);
    } catch (err: any) {
      toast.error(err.message || '移动失败');
    }
  };

  // Right-click context menu
  const handleContextMenu = (e: React.MouseEvent, lib: Library) => {
    e.preventDefault();
    setContextMenu({ library: lib, x: e.clientX, y: e.clientY });
  };

  return (
    <AnimatedPage>
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Left: Library Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">我的文献库</h2>
            <Button size="sm" variant="ghost" onClick={openCreateDialog} className="gap-1 text-primary-500">
              <Plus className="h-4 w-4" />
              新建
            </Button>
          </div>

          {/* Library Tree */}
          <div className="flex-1 space-y-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              libraries.map(lib => {
                const isActive = lib.id === selectedLibraryId;
                return (
                  <div
                    key={lib.id}
                    onClick={() => setSelectedLibraryId(lib.id)}
                    onContextMenu={(e) => !lib.isDefault && handleContextMenu(e, lib)}
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200',
                      isActive
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'hover:bg-muted',
                      lib.isDefault && 'cursor-default'
                    )}
                  >
                    {/* Color dot */}
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: lib.color }}
                    />
                    <LibraryIcon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-muted-foreground')} />
                    <span className="text-sm font-medium truncate flex-1">{lib.name}</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full shrink-0',
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {lib.id === 'lib-all' ? allPapers.length : lib.paperIds.length}
                    </span>
                    {/* Hover actions */}
                    {!lib.isDefault && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(lib); }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 transition-opacity',
                          isActive && 'opacity-100'
                        )}
                        onClickCapture={(e) => e.stopPropagation()}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New Library Button */}
          <Button variant="outline" className="gap-2 w-full justify-start" onClick={openCreateDialog}>
            <FolderPlus className="h-4 w-4" />
            <span className="text-sm">创建新文献库</span>
          </Button>
        </aside>

        {/* Right: Paper List */}
        <div className="flex-1 space-y-4">
          {/* Mobile library selector */}
          <div className="lg:hidden">
            <select
              value={selectedLibraryId}
              onChange={e => setSelectedLibraryId(e.target.value)}
              className="w-full p-2 rounded-lg border bg-background text-sm"
            >
              {libraries.map(lib => (
                <option key={lib.id} value={lib.id}>
                  {lib.name} ({lib.id === 'lib-all' ? allPapers.length : lib.paperIds.length})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索当前文献库中的论文..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Paper count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedLibrary?.name} · {filteredPapers.length} 篇论文
            </p>
            {!selectedLibrary?.isDefault && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: selectedLibrary?.color + '20', color: selectedLibrary?.color }}
              >
                <Edit2 className="h-3 w-3" />
                可管理
              </span>
            )}
          </div>

          {/* Papers */}
          {filteredPapers.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="文献库为空"
              description={search ? '未找到匹配的论文' : '该文献库中还没有论文，请从文献库导入。'}
            />
          ) : (
            <div className="space-y-2">
              {filteredPapers.map((paper, i) => (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="group flex items-start gap-4 rounded-lg border p-4 hover:shadow-md transition-all hover:border-primary/30">
                    {/* Book icon */}
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Link to={`/paper/${paper.id}`} className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-1">
                            {paper.title}
                          </h3>
                        </Link>
                        {paper.isFavorited && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400 mt-0.5" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 ? ' et al.' : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{paper.venue}</Badge>
                        <span className="text-[11px] text-muted-foreground">{paper.year}</span>
                        {paper.tags.slice(0, 2).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="移动到其他文献库"
                        onClick={() => { setMovingPaper(paper); setMoveDialogOpen(true); }}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Link to={`/paper/${paper.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="查看详情">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Library Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? '创建新文献库' : '编辑文献库'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">文献库名称 *</label>
              <Input
                value={libForm.name}
                onChange={e => { setLibForm(f => ({ ...f, name: e.target.value })); setLibNameError(''); }}
                placeholder="例如：GNN核心论文"
                maxLength={50}
              />
              {libNameError && <p className="text-xs text-destructive mt-1">{libNameError}</p>}
            </div>
            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">描述（可选）</label>
              <Textarea
                value={libForm.description}
                onChange={e => setLibForm(f => ({ ...f, description: e.target.value }))}
                placeholder="简要描述这个文献库的用途..."
                rows={2}
                maxLength={200}
              />
            </div>
            {/* Color */}
            <div>
              <label className="text-sm font-medium mb-2 block">颜色</label>
              <div className="flex gap-2 flex-wrap">
                {LIBRARY_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setLibForm(f => ({ ...f, color }))}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      libForm.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveLibrary}>
              {dialogMode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除文献库</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除文献库「<strong>{deletingLibrary?.name}</strong>」吗？论文不会被删除，只是从该库中移除。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={confirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Paper Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>移动论文到其他文献库</DialogTitle>
          </DialogHeader>
          {movingPaper && (
            <div className="py-2">
              <p className="text-sm font-medium mb-3">{movingPaper.title}</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {libraries.filter(l => l.id !== selectedLibraryId).map(lib => (
                  <button
                    key={lib.id}
                    onClick={() => movePaper(lib.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lib.color }} />
                    <LibraryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{lib.name}</span>
                    {lib.paperIds.includes(movingPaper.id) && (
                      <Check className="h-3 w-3 ml-auto text-primary" />
                    )}
                  </button>
                ))}
                {libraries.filter(l => l.id !== selectedLibraryId).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无其他文献库</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveDialogOpen(false); setMovingPaper(null); }}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={() => openEditDialog(contextMenu.library)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                重命名
              </button>
              <button
                onClick={() => { setDeletingLibrary(contextMenu.library); setDeleteDialogOpen(true); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

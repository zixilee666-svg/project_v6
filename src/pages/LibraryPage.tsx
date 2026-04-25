// ========================================
// LibraryPage — 文献库
// ========================================
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Grid3X3, List, Star, ExternalLink,
  ChevronDown, BookOpen, Tag, X, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AnimatedPage from '@/components/shared/AnimatedPage';
import EmptyState from '@/components/shared/EmptyState';
import { seedPapers } from '@/data/papers';
import type { Paper } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type SortKey = 'addedDate' | 'year' | 'citationCount' | 'title';
type SortDir = 'asc' | 'desc';

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('addedDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // All unique tags
  const allTags = useMemo(
    () => Array.from(new Set(seedPapers.flatMap((p) => p.tags))).sort(),
    []
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...seedPapers];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.some((a) => a.toLowerCase().includes(q)) ||
          p.keywords.some((k) => k.toLowerCase().includes(q)) ||
          p.venue.toLowerCase().includes(q)
      );
    }

    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }

    if (onlyFavorites) {
      result = result.filter((p) => p.isFavorited);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'addedDate':
          cmp = new Date(a.addedAt || a.addedDate || '1970-01-01').getTime() - new Date(b.addedAt || b.addedDate || '1970-01-01').getTime();
          break;
        case 'year':
          cmp = a.year - b.year;
          break;
        case 'citationCount':
          cmp = (a.citationCount || 0) - (b.citationCount || 0);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [search, selectedTag, onlyFavorites, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">文献库</h1>
            <p className="text-sm text-muted-foreground">
              共 {seedPapers.length} 篇文献 · 已筛选 {filtered.length} 篇
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索标题、作者、关键词、会议..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            筛选
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                showFilters && 'rotate-180'
              )}
            />
          </Button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">标签筛选</span>
                      {selectedTag && (
                        <button
                          onClick={() => setSelectedTag(null)}
                          className="text-xs text-primary hover:underline"
                        >
                          清除
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTag === tag ? 'default' : 'outline'}
                          className="cursor-pointer select-none"
                          onClick={() =>
                            setSelectedTag(selectedTag === tag ? null : tag)
                          }
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">排序方式</label>
                    <div className="flex flex-wrap gap-2 ml-2">
                      {(
                        [
                          ['addedDate', '添加时间'],
                          ['year', '年份'],
                          ['citationCount', '引用量'],
                          ['title', '标题'],
                        ] as [SortKey, string][]
                      ).map(([key, label]) => (
                        <Badge
                          key={key}
                          variant={sortKey === key ? 'default' : 'outline'}
                          className="cursor-pointer select-none"
                          onClick={() => toggleSort(key)}
                        >
                          {label}
                          {sortKey === key &&
                            (sortDir === 'desc' ? ' ↓' : ' ↑')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(e) => setOnlyFavorites(e.target.checked)}
                        className="mr-2"
                      />
                      仅显示收藏
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Papers Grid / List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="没有找到匹配的文献"
            description={
              search
                ? `未找到与「${search}」匹配的文献，请尝试其他关键词。`
                : '当前筛选条件下没有文献，请调整筛选条件。'
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  清除搜索
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((paper, i) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/paper/${paper.id}`}>
                  <PaperCard paper={paper} />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((paper, i) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to={`/paper/${paper.id}`}>
                  <PaperListItem paper={paper} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}

// ---------- Grid Card ----------
function PaperCard({ paper }: { paper: Paper }) {
  return (
    <Card className="group h-full transition-all hover:shadow-card-hover cursor-pointer">
      <CardContent className="pt-5 pb-4 flex flex-col h-full">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {paper.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
              {t}
            </Badge>
          ))}
          {paper.isFavorited && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 ml-auto" />
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-3 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
          {paper.title}
        </h3>

        {/* Authors */}
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
          {paper.authors.slice(0, 2).join(', ')}
          {paper.authors.length > 2 ? ' et al.' : ''}
        </p>

        {/* Meta */}
        <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-medium">{paper.venue}</span>
          <span>{paper.year}</span>
          <span>{paper.citationCount} 引用</span>
        </div>

        {/* Joan Note preview */}
        {paper.joanNote && (
          <p className="mt-2 line-clamp-2 text-[11px] text-primary-400 dark:text-primary-300 italic border-t border-primary-100 dark:border-primary-700 pt-2">
            ⚖️ {paper.joanNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- List Item ----------
function PaperListItem({ paper }: { paper: Paper }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-all hover:shadow-card hover:border-primary/30">
      <div className="mt-0.5 hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-primary transition-colors flex-1">
            {paper.title}
          </h3>
          {paper.isFavorited && (
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {paper.authors.slice(0, 3).join(', ')}
          {paper.authors.length > 3 ? ' et al.' : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {paper.venue}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{paper.year}</span>
          <span className="text-[11px] text-muted-foreground">
            {paper.citationCount} 引用
          </span>
          {paper.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
              {t}
            </Badge>
          ))}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {formatRelativeTime(paper.addedAt || paper.addedDate || new Date().toISOString())}
          </span>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
    </div>
  );
}

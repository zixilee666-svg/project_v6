import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  GraduationCap,
  BookOpen,
  Globe,
  TrendingUp,
  ArrowUpDown,
  Eye,
  FileText,
  FlaskConical,
  Users,
} from 'lucide-react';
import { spaceService, type SpaceConfig } from '@/services/spaceService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AnimatedPage from '@/components/shared/AnimatedPage';
import Loading from '@/components/common/Loading';
import Pagination from '@/components/common/Pagination';

// ── SpaceCard ──
function SpaceCard({ space }: { space: SpaceConfig }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <Link to={`/u/${space.username}`} className="block">
          <CardContent className="pt-5 pb-4">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-lg font-bold">
                {(space.displayName || space.username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {space.displayName || space.username}
                </h3>
                {space.institution && (
                  <p className="text-xs text-primary-400 truncate">
                    {space.institution}
                  </p>
                )}
              </div>
            </div>

            {/* Research tags */}
            {space.researchField && (
              <div className="flex flex-wrap gap-1 mb-3">
                {space.researchField.split(/[,，、]/).map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {f.trim()}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {space.paperCount} 篇文献
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                {space.projectCount} 个项目
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {space.viewCount}
              </span>
            </div>

            {/* Popularity bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-400 transition-all"
                  style={{ width: `${Math.min(100, space.popularity || 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {space.popularity || 0}
              </span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}

// ── Gallery Page ──
export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState<SpaceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [field, setField] = useState(searchParams.get('field') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popularity');
  const [totalSpaces, setTotalSpaces] = useState(0);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') || '1'));
  const pageSize = 12;
  const totalPages = Math.ceil(totalSpaces / pageSize);

  const updateSearchParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    updateSearchParams({
      search,
      field,
      sort,
      page: String(currentPage),
    });
  }, [search, field, sort, currentPage, updateSearchParams]);

  useEffect(() => {
    loadSpaces();
  }, [search, field, sort, currentPage]);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const res = await spaceService.list({ search, field, sort, page: currentPage });
      if (res.success && res.data) {
        setSpaces(res.data.spaces || []);
        setTotalSpaces(res.data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load spaces:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setCurrentPage(1);
  };

  const handleFieldChange = (value: string) => {
    setField(value === 'all' ? '' : value);
    setCurrentPage(1);
  };

  return (
    <AnimatedPage className="min-h-screen bg-ivory-100 dark:bg-primary-900">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-800 dark:text-ivory-100 font-display">
            学术空间画廊
          </h1>
          <p className="mt-1 text-sm text-primary-400">
            探索研究者的学术世界
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <strong className="text-foreground">{totalSpaces}</strong> 位学者
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <strong className="text-foreground">
              {spaces.reduce((sum, s) => sum + s.paperCount, 0)}
            </strong>{' '}
            篇文献
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-primary" />
            <strong className="text-foreground">{totalSpaces}</strong> 个空间
          </span>
        </div>

        {/* Search + Filters */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <Input
                  placeholder="搜索学者、机构、研究领域..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={field || 'all'} onValueChange={handleFieldChange}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="研究领域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部领域</SelectItem>
                  <SelectItem value="graph-neural-network">图神经网络</SelectItem>
                  <SelectItem value="natural-language-processing">自然语言处理</SelectItem>
                  <SelectItem value="computer-vision">计算机视觉</SelectItem>
                  <SelectItem value="reinforcement-learning">强化学习</SelectItem>
                  <SelectItem value="fraud-detection">欺诈检测</SelectItem>
                  <SelectItem value="recommendation-system">推荐系统</SelectItem>
                  <SelectItem value="knowledge-graph">知识图谱</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <ArrowUpDown className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">最受欢迎</SelectItem>
                  <SelectItem value="recent">最近活跃</SelectItem>
                  <SelectItem value="papers">文献最多</SelectItem>
                </SelectContent>
              </Select>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Loading message="正在加载学术空间..." />
        ) : spaces.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 mx-auto text-primary-300 mb-4" />
            <h3 className="text-lg font-semibold text-primary-800 dark:text-ivory-100">
              暂无学术空间
            </h3>
            <p className="text-sm text-primary-400 mt-1">尝试调整搜索条件或筛选器</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {spaces.map((space, idx) => (
                <motion.div
                  key={space.username}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  <SpaceCard space={space} />
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AnimatedPage>
  );
}

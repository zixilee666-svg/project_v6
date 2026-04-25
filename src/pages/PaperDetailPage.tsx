// ========================================
// PaperDetailPage — 文献详情
// ========================================
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, ExternalLink, Quote, BookmarkPlus,
  BookOpen, MessageSquare, Highlighter, Calendar, Hash,
  FileText, Users, Building2, Tag, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import AnimatedPage from '@/components/shared/AnimatedPage';
import JoanQuote from '@/components/shared/JoanQuote';
import EmptyState from '@/components/shared/EmptyState';
import { seedPapers } from '@/data/papers';
import { cn, formatDate } from '@/lib/utils';

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isFav, setIsFav] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState<{ id: string; content: string; createdAt: string }[]>([]);

  const paper = useMemo(
    () => seedPapers.find((p) => p.id === id),
    [id]
  );

  if (!paper) {
    return (
      <AnimatedPage>
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="文献未找到"
          description="请求的文献不存在或已被移除。"
          action={
            <Button onClick={() => navigate('/library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回文献库
            </Button>
          }
        />
      </AnimatedPage>
    );
  }

  // Sync favorite state with paper data
  useEffect(() => {
    setIsFav(paper.isFavorited);
  }, [paper.isFavorited]);

  const toggleFav = () => {
    setIsFav(!isFav);
    toast.success(isFav ? '已取消收藏' : '已添加到收藏');
  };

  const addNote = () => {
    if (!notes.trim()) return;
    setSavedNotes((prev) => [
      ...prev,
      {
        id: Date.now().toString(36),
        content: notes.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNotes('');
    toast.success('笔记已保存');
  };

  const copyCitation = (format: string) => {
    let citation = '';
    const authors = paper.authors.join(', ');
    switch (format) {
      case 'bibtex':
        citation = `@${paper.venueType === 'conference' ? 'inproceedings' : paper.venueType === 'journal' ? 'article' : 'misc'}{${paper.authors[0]?.split(' ').pop()?.toLowerCase() ?? 'unknown'}${paper.year},
  title={${paper.title}},
  author={${authors}},
  year={${paper.year}},
  booktitle={${paper.venue}}
}`;
        break;
      case 'ieee':
        citation = `${authors}, "${paper.title}," ${paper.venue}, ${paper.year}.`;
        break;
      case 'gb7714':
        citation = `${authors}. ${paper.title}[J]. ${paper.venue}, ${paper.year}.`;
        break;
    }
    navigator.clipboard.writeText(citation).then(() => {
      toast.success(`${format.toUpperCase()} 引用已复制`);
    }).catch(() => {
      // Fallback: use textarea copy
      const textarea = document.createElement('textarea');
      textarea.value = citation;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success(`${format.toUpperCase()} 引用已复制`);
    });
  };

  const relatedPapers = seedPapers
    .filter(
      (p) =>
        p.id !== paper.id &&
        p.tags.some((t) => paper.tags.includes(t))
    )
    .slice(0, 6);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Top Nav */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCitation('bibtex')}
              className="text-xs"
            >
              <Quote className="h-3 w-3 mr-1" />
              BibTeX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCitation('ieee')}
              className="text-xs"
            >
              IEEE
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCitation('gb7714')}
              className="text-xs"
            >
              GB/T
            </Button>
            <Button
              variant={isFav ? 'default' : 'outline'}
              size="sm"
              onClick={toggleFav}
            >
              <Star className={cn('h-4 w-4 mr-1', isFav && 'fill-current')} />
              {isFav ? '已收藏' : '收藏'}
            </Button>
            {paper.pdfUrl ? (
              <Button variant="default" size="sm" asChild>
                <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  PDF
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ExternalLink className="h-4 w-4 mr-1" />
                暂无PDF
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {paper.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
            {paper.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {paper.authors.join(', ')}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {paper.venue}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {paper.year}
            </span>
            <span className="flex items-center gap-1">
              <BookmarkPlus className="h-4 w-4" />
              {paper.citationCount || 0} 引用
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              添加于 {formatDate(paper.addedAt || paper.addedDate || '')}
            </span>
          </div>
        </div>

        {/* Joan's Note */}
        {paper.joanNote && (
          <JoanQuote category="academic" className="max-w-full" />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="notes">
              笔记
              {savedNotes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {savedNotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="highlights">高亮标注</TabsTrigger>
            <TabsTrigger value="related">相关文献</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* Abstract */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {paper.abstract}
                </p>
              </CardContent>
            </Card>

            {/* Keywords */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">关键词</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="gap-1">
                      <Hash className="h-3 w-3" />
                      {kw}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Meta Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">元数据</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  {[
                    ['发表类型', paper.venueType],
                    ['会议/期刊', paper.venue],
                    ['年份', String(paper.year)],
                    ['引用量', String(paper.citationCount)],
                    ['DOI', paper.doi || '暂无'],
                    ['PDF', paper.pdfUrl ? '可用' : '暂无'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  添加笔记
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="在这里记录你的阅读笔记、思考与感悟..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addNote} disabled={!notes.trim()}>
                    保存笔记
                  </Button>
                </div>
              </CardContent>
            </Card>

            {savedNotes.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="暂无笔记"
                description="在上方添加第一条阅读笔记。"
              />
            ) : (
              <div className="space-y-3">
                {savedNotes.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Highlights Tab */}
          <TabsContent value="highlights" className="mt-4">
            <EmptyState
              icon={<Highlighter className="h-8 w-8" />}
              title="暂无高亮标注"
              description="在 PDF 预览模式中选择文本即可创建高亮标注。PDF 预览功能即将上线。"
            />
          </TabsContent>

          {/* Related Tab */}
          <TabsContent value="related" className="mt-4">
            {relatedPapers.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="暂无相关文献"
                description="未找到与本文标签匹配的其他文献。"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPapers.map((rp) => (
                  <Link key={rp.id} to={`/paper/${rp.id}`}>
                    <Card className="h-full transition-all hover:shadow-card-hover cursor-pointer">
                      <CardContent className="pt-4 pb-3">
                        <h4 className="line-clamp-2 text-sm font-semibold hover:text-primary transition-colors">
                          {rp.title}
                        </h4>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {rp.authors.slice(0, 2).join(', ')} · {rp.year}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rp.tags.slice(0, 2).map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedPage>
  );
}

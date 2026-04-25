// ========================================
// ImportExportPage — 批量导入导出
// ========================================
import { useState, useCallback } from 'react';
import {
  Upload, Download, FileText, FileSpreadsheet, Search,
  Atom, BookOpen, AlertCircle, CheckCircle2, Loader2,
  ClipboardList, ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import AnimatedPage from '@/components/shared/AnimatedPage';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<'arxiv' | 'semantic'>('arxiv');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Search handlers
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    // Simulated search results
    await new Promise((r) => setTimeout(r, 1500));

    const mockResults = [
      {
        id: 's1',
        title: `Graph Neural Networks for ${searchQuery}: A Comprehensive Study`,
        authors: ['Alice Smith', 'Bob Johnson'],
        year: 2024,
        venue: 'NeurIPS',
        abstract: `This paper presents a comprehensive study of GNN applications in ${searchQuery}...`,
        citations: 45,
        source: 'arXiv',
      },
      {
        id: 's2',
        title: `Heterogeneous ${searchQuery} Detection via Attention Mechanism`,
        authors: ['Carol Williams', 'David Brown'],
        year: 2024,
        venue: 'KDD',
        abstract: `We propose a novel attention mechanism for ${searchQuery} detection in heterogeneous graphs...`,
        citations: 23,
        source: 'arXiv',
      },
      {
        id: 's3',
        title: `Dynamic Graph Learning for ${searchQuery} Analysis`,
        authors: ['Eve Davis', 'Frank Miller'],
        year: 2023,
        venue: 'ICLR',
        abstract: `A temporal approach to ${searchQuery} using dynamic graph neural networks...`,
        citations: 67,
        source: 'Semantic Scholar',
      },
      {
        id: 's4',
        title: `Multi-scale Representation Learning for ${searchQuery}`,
        authors: ['Grace Wilson', 'Henry Taylor'],
        year: 2024,
        venue: 'WWW',
        abstract: `Multi-scale approach capturing hierarchical patterns in ${searchQuery} data...`,
        citations: 12,
        source: 'Semantic Scholar',
      },
    ];

    setSearchResults(mockResults);
    setIsSearching(false);
    toast.success(`找到 ${mockResults.length} 条结果`);
  }, [searchQuery]);

  const importFromSearch = useCallback(async (paper: any) => {
    setImporting(true);
    setImportProgress(0);

    // Simulate import progress
    const steps = [20, 45, 70, 90, 100];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 400));
      setImportProgress(step);
    }

    setImporting(false);
    toast.success(`「${paper.title}」已导入文献库`);
  }, []);

  // File import handler
  const handleFileImport = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const supported = ['bib', 'bibtex', 'csv', 'json', 'ris'];
    if (!ext || !supported.includes(ext)) {
      toast.error(`不支持的文件格式: .${ext}。支持: ${supported.join(', ')}`);
      return;
    }

    toast.loading(`正在解析 ${file.name}...`, { id: 'file-import' });
    setTimeout(() => {
      toast.success(`成功从 ${file.name} 导入文献`, { id: 'file-import' });
    }, 2000);
  }, []);

  // Export handlers
  const handleExport = useCallback((format: string) => {
    toast.loading(`正在生成 ${format.toUpperCase()} 文件...`, { id: 'export' });
    setTimeout(() => {
      toast.success(`${format.toUpperCase()} 导出成功`, { id: 'export' });
    }, 1500);
  }, []);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">导入导出</h1>
          <p className="text-sm text-muted-foreground">
            批量管理文献数据，从外部源搜索并导入
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="import" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              导入
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              导出
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="mt-4 space-y-6">
            {/* Online Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  在线搜索
                </CardTitle>
                <CardDescription>
                  从 arXiv 和 Semantic Scholar 搜索文献并直接导入
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">搜索来源：</span>
                  <div className="flex gap-2">
                    <Button
                      variant={searchSource === 'arxiv' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSearchSource('arxiv')}
                    >
                      <Atom className="h-3.5 w-3.5" />
                      arXiv
                    </Button>
                    <Button
                      variant={searchSource === 'semantic' ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSearchSource('semantic')}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Semantic Scholar
                    </Button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={
                        searchSource === 'arxiv'
                          ? '搜索 arXiv 论文标题、作者、ID...'
                          : '搜索 Semantic Scholar 论文...'
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {isSearching && (
                  <div className="flex items-center gap-3 p-8 justify-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">
                      正在从 {searchSource === 'arxiv' ? 'arXiv' : 'Semantic Scholar'} 搜索...
                    </span>
                  </div>
                )}

                {searchResults.length > 0 && !isSearching && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      找到 {searchResults.length} 条结果
                    </p>
                    {searchResults.map((paper, i) => (
                      <motion.div
                        key={paper.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-4 rounded-lg border p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold">{paper.title}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {paper.authors.join(', ')} · {paper.year} · {paper.venue}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                            {paper.abstract}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {paper.citations} 引用
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {paper.source}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => importFromSearch(paper)}
                          disabled={importing}
                          className="shrink-0"
                        >
                          {importing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import Progress */}
            {importing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">正在导入文献...</span>
                      <span className="text-sm text-muted-foreground">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* File Import */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文件导入
                </CardTitle>
                <CardDescription>
                  上传 BibTeX / CSV / RIS / JSON 格式的文献文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/20 hover:border-primary/40'
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileImport(file);
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.bib,.bibtex,.csv,.json,.ris';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileImport(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    拖拽文件到此处，或点击上传
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持 .bib / .csv / .ris / .json 格式
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导出格式</CardTitle>
                <CardDescription>
                  选择导出格式，下载你的文献库数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      format: 'bibtex',
                      icon: FileText,
                      label: 'BibTeX',
                      desc: 'LaTeX 引用格式，适合学术论文',
                      ext: '.bib',
                    },
                    {
                      format: 'csv',
                      icon: FileSpreadsheet,
                      label: 'CSV',
                      desc: '电子表格格式，适合数据分析',
                      ext: '.csv',
                    },
                    {
                      format: 'json',
                      icon: ClipboardList,
                      label: 'JSON',
                      desc: '结构化数据格式，适合程序处理',
                      ext: '.json',
                    },
                    {
                      format: 'ris',
                      icon: FileText,
                      label: 'RIS',
                      desc: '通用引用格式，适合导入 EndNote/Zotero',
                      ext: '.ris',
                    },
                  ].map((opt) => (
                    <motion.div
                      key={opt.format}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="rounded-lg border p-4 h-full flex flex-col">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                          <opt.icon className="h-5 w-5" />
                        </div>
                        <h4 className="text-sm font-semibold">{opt.label}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1 flex-1">
                          {opt.desc}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleExport(opt.format)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          导出 {opt.ext}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导出选项</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">导出范围</label>
                  <div className="flex gap-2 mt-2">
                    <Button variant="default" size="sm">
                      全部文献
                    </Button>
                    <Button variant="outline" size="sm">
                      仅收藏
                    </Button>
                    <Button variant="outline" size="sm">
                      按标签筛选
                    </Button>
                    <Button variant="outline" size="sm">
                      按项目导出
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">快速导出全部文献</p>
                    <p className="text-xs text-muted-foreground">
                      以默认 BibTeX 格式导出所有文献
                    </p>
                  </div>
                  <Button onClick={() => handleExport('bibtex')} className="gap-2">
                    <Download className="h-4 w-4" />
                    快速导出
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedPage>
  );
}

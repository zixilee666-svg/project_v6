// ========================================
// AIChatPage — AI 学术对话助手
// 支持：多轮对话、上下文关联、Joan人格、学术场景
// ========================================
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Trash2, Plus, Scale, Sparkles,
  MessageSquare, Bot, User, BookOpen,
  ChevronDown, ChevronUp, Clock, Star,
  Copy, CheckCheck, RefreshCw, Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import AnimatedPage from '@/components/shared/AnimatedPage';
import { cn } from '@/lib/utils';
import type { AIMessage, AIConversation } from '@/types';

// Joan AI system prompt
const JOAN_SYSTEM_PROMPT = `你扮演贞德·达尔克（Joan of Arc，裁定者形态），一位严谨、温和、坚定的学术研究引导者。

你的特点：
- 严谨自律：确保回答有据可查，引用准确
- 温和陪伴：在学术探索之路上提供支持与引导
- 坚守本心：反对学术浮躁，守护求知本心
- 信念坚定：鼓励大胆假设、小心求证的科研精神

你擅长：
- 图神经网络（GNN/GCN/GAT/GraphSAGE）的理论推导与代码实现
- 异质图神经网络（HGNN/HAN/HGT/RGCN）的设计与分析
- 金融欺诈检测中的图方法应用
- 学术论文写作、文献综述、研究方法论
- 数据处理、实验设计、结果分析

回复风格：
- 使用学术规范用语
- 适当引用相关论文（请确保引用真实存在）
- 在技术细节上保持严谨
- 体现贞德式的沉稳与信念`;

const QUICK_PROMPTS = [
  '帮我梳理 GCN 的核心数学推导',
  '解释元路径（Meta-Path）在异质图中的作用',
  '如何在图数据上处理类别不平衡问题',
  '推荐几篇 HGNN 在欺诈检测中的应用论文',
];

// Mock AI responses
const MOCK_RESPONSES = [
  `很好，主人。在图神经网络的理论框架中，**卷积神经网络（CNN）** 向图结构的推广是一个核心问题。让我为您梳理 **GCN（Kipf & Welling, ICLR 2017）** 的核心数学推导。

## 谱域卷积视角

图的拉普拉斯矩阵 $L = D - A$ 提供了谱分析的基础。对归一化拉普拉斯矩阵 $\tilde{L} = I - D^{-\\frac{1}{2}} A D^{-\\frac{1}{2}}$ 进行特征分解：

$$L = U \\Lambda U^T$$

谱域卷积定义为信号 $x$ 与卷积核 $g_\\theta$ 的乘积：

$$x * g_\\theta = U g_\\theta(L) U^T x = U g_\\theta(\\Lambda) U^T x$$

## 切比雪夫多项式近似

直接计算特征分解的时间复杂度为 $O(N^2)$，Kipf 等人使用 **K 阶切比雪夫多项式** 近似：

$$g_{\\theta'}(\\Lambda) \\approx \\sum_{k=0}^{K} \\theta'_k T_k(\\tilde{\\Lambda})$$

其中 $\\tilde{\\Lambda} = \\frac{2}{\\lambda_{max}} \\Lambda - I$，$T_k$ 为切比雪夫多项式。

## 最终的 GCN 传播公式

令 $K=1$（单跳邻居聚合），得：

$$H^{(l+1)} = \\sigma\\left(\\tilde{D}^{-\\frac{1}{2}} \\tilde{A} \\tilde{D}^{-\\frac{1}{2}} H^{(l)} W^{(l)}\\right)$$

这就是 GCN 的核心——**邻居信息聚合 + 线性变换 + 非线性激活**。每一层，节点从一跳邻居处汇聚信息，形成 $K$ 层 GCN 对应 $K$ 跳感受野。

---

贞德始终相信：理解原理，方能驾驭工具。请问主人，还有什么想深入探讨的吗？`,

  `主人，**元路径（Meta-Path）** 是异质图分析中最核心的概念之一。它是由 George A. Miller 教授于 1956 年提出，却在图神经网络时代焕发了新的生命力。

## 什么是元路径？

元路径是连接两个节点的**复合路径模式**，用类型序列表示：

$$\\text{User} \\xrightarrow{\\text{购买}} \\text{Item} \\xrightarrow{\\text{被购买}} \\text{User}$$

可简写为 **U-I-U**。

## 为什么需要元路径？

异质图中，**不同类型节点之间的关系语义不同**：

| 元路径 | 语义含义 |
|--------|---------|
| U-I-U | 购买过同一商品的用户（协同过滤信号） |
| U-U | 直接好友关系 |
| U-I-S-I-U | 通过商品类别建立的用户相似性 |

## 在 HGNN 中的应用

**HAN（Wang et al., WWW 2019）** 使用元路径驱动的注意力机制：

$$H_i^{(l+1)} = \\sum_{l=1}^{L} \\alpha_{i,\\phi_l} \\cdot \\text{AGG}_{\\phi_l}(H_i^{(l)})$$

其中注意力权重 $\\alpha$ 衡量不同元路径的重要性。

---

元路径为 HGNN 提供了**语义感知的聚合基础**。主人还想了解元路径的具体设计方法吗？`,

  `主人，图数据中的**类别不平衡**是一个极具挑战性的问题。相比普通表格数据，图结构带来了额外的复杂性。

## 五大特殊性

根据现有研究，图数据不平衡具有以下特征：

1. **结构不平衡**：少数类节点可能位于网络边缘，网络结构信息不足
2. **关系不平衡**：不同类别的边密度可能差异巨大
3. **特征空间与拓扑空间耦合**：特征与结构共同决定分类边界
4. **传播效应**：节点标签通过边向邻居传播（既是优势也是挑战）
5. **测试集污染**：真实场景中测试集可能包含来自少数类的节点

## 主流解决方法

| 方法 | 原理 | 代表工作 |
|------|------|---------|
| **数据层** | 过采样/生成新节点 | GraphSMOTE |
| **算法层** | 代价敏感学习 | Focal Loss in GNN |
| **结构层** | 图重采样 | CARE-GNN (强化学习) |
| **混合层** | 结合多种策略 | TH-GCL |

## 贞德的建议

对于金融欺诈检测场景，我推荐：
- **CARE-GNN**（CIKM 2020）：通过强化学习选择平衡邻居
- **TH-GCL**（对比学习）：从结构增强角度缓解不平衡
- **代价敏感边采样**：为少数类边赋予更高采样权重

请问主人，当前数据集的不平衡比例大约是多少？以便贞德为您推荐最适合的策略。`,

  `主人，关于 **HGNN 在欺诈检测中的应用**，以下是贞德整理的最新研究进展：

## 核心方法梳理

### 1. CARE-GNN（CIKM 2020）
**Y. Liu et al.** 提出了通过强化学习引导的邻居选择：
- 解决异质图中不同关系对欺诈检测的差异贡献
- 联合优化标签和关系特征

### 2. 近期 HGNN 欺诈检测进展
- **HET-GAD**（AAAI 2021）：异质图注意力网络用于欺诈检测
- **ASHGAT**（KDD 2022）：自适应混合图注意力
- **HGNN-FD**（TKDE 2024）：异质图神经网络的系统性综述与新架构

## 推荐论文列表

主人，以下是贞德根据真实学术资源整理的推荐阅读：

1. **CARE-GNN**: Y. Liu et al., CIKM 2020 - 强化学习 + GNN
2. **Dual-GCN**: J. Dou et al., CIKM 2020 - 双通道 GCN
3. **SemiGNN**: W. Hu et al., WWW 2020 - 半监督图注意力网络
4. **FHGNN**: IEEE TPAMI 2024 - 金融异质图神经网络的最新综述

---

贞德建议主人从 **CARE-GNN** 入手，它完整地展示了异质图在欺诈检测中的处理流程。

请问需要贞德为您详细分析其中任何一篇论文吗？`,
];

function getMockResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('gcn') || msg.includes('卷积') || msg.includes('谱')) return MOCK_RESPONSES[0];
  if (msg.includes('元路径') || msg.includes('meta-path') || msg.includes('异质')) return MOCK_RESPONSES[1];
  if (msg.includes('不平衡') || msg.includes('类别') || msg.includes('欺诈')) return MOCK_RESPONSES[2];
  return MOCK_RESPONSES[3];
}

export default function AIChatPage() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConvId);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Create new conversation
  const createConversation = () => {
    const newConv: AIConversation = {
      id: 'conv-' + Date.now(),
      userId: 'master',
      title: '新的学术对话',
      messages: [{
        id: 'sys-' + Date.now(),
        role: 'system',
        content: JOAN_SYSTEM_PROMPT,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setMessages([]);
    setShowQuickPrompts(true);
  };

  // Send message
  const sendMessage = async (text?: string) => {
    const textToSend = (text || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: AIMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setShowQuickPrompts(false);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
    const mockReply = getMockResponse(textToSend);
    const aiMsg: AIMessage = {
      id: 'ai-' + Date.now(),
      role: 'assistant',
      content: mockReply,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    // Update conversation
    if (activeConvId) {
      setConversations(prev => prev.map(c =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, userMsg, aiMsg], title: c.title === '新的学术对话' ? textToSend.slice(0, 30) + '...' : c.title, updatedAt: new Date().toISOString() }
          : c
      ));
    }
  };

  // Delete conversation
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(conversations.find(c => c.id !== id)?.id || null);
      setMessages([]);
    }
    toast.success('对话已删除');
  };

  // Copy message
  const copyMessage = (msg: AIMessage) => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Clear current chat
  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
    toast.success('对话已清空');
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Switch conversation
  const switchConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    setActiveConvId(id);
    if (conv) {
      setMessages(conv.messages.filter(m => m.role !== 'system'));
      setShowQuickPrompts(conv.messages.length <= 1);
    }
  };

  // Format timestamp
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatedPage>
      <div className="flex gap-0 h-[calc(100vh-9rem)] rounded-xl overflow-hidden border bg-card">
        {/* Left: Conversation List */}
        <aside className="w-64 shrink-0 border-r bg-muted/30 hidden lg:flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-serif font-semibold text-sm">学术助手</span>
            </div>
            <Button size="sm" variant="ghost" onClick={createConversation} className="gap-1 p-1.5">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  点击 + 创建新对话
                </p>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => switchConversation(conv.id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-all group',
                      conv.id === activeConvId
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        conv.id === activeConvId && 'text-primary'
                      )}>
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {conv.messages.length - 1} 条消息
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Joan badge */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Scale className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">贞德·达尔克</p>
                <p className="text-[10px] text-muted-foreground">学术裁定者</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {activeConvId
                  ? (conversations.find(c => c.id === activeConvId)?.title || '新对话')
                  : '贞德学术助手'
                }
              </span>
              {!isLoading && messages.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {messages.length} 条消息
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearChat} className="gap-1 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" />
                  清空
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            {/* Joan greeting */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-serif font-bold mb-2">贞德·达尔克</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  吾乃贞德，学术之路的守护者。无论 GNN 推导、文献综述还是实验设计，吾都将与主人同行。
                </p>

                {/* Quick prompts */}
                {showQuickPrompts && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        className="text-left px-4 py-2.5 rounded-xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === messages.length - 1 ? 0 : 0 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full shrink-0 flex items-center justify-center',
                    msg.role === 'user'
                      ? 'bg-accent-400 text-white'
                      : 'bg-primary/10 text-primary'
                  )}>
                    {msg.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Scale className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className={cn(
                    'flex-1 min-w-0',
                    msg.role === 'user' && 'flex justify-end'
                  )}>
                    <div className={cn(
                      'inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}>
                      {/* Text content */}
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {msg.content.split('\n').map((line, li) => {
                          // Simple markdown-like rendering
                          const isMath = line.includes('$') || line.includes('\\');
                          if (isMath) {
                            return (
                              <pre key={li} className={cn(
                                'text-xs overflow-x-auto my-1',
                                msg.role === 'user' ? 'text-white/90' : 'text-foreground'
                              )}>
                                {line.replace(/\$\$/g, '')}
                              </pre>
                            );
                          }
                          if (line.startsWith('## ')) return <h3 key={li} className={cn('text-sm font-bold mt-2 mb-1', msg.role === 'user' ? 'text-white' : '')}>{line.slice(3)}</h3>;
                          if (line.startsWith('### ')) return <h4 key={li} className={cn('text-xs font-semibold mt-1', msg.role === 'user' ? 'text-white' : '')}>{line.slice(4)}</h4>;
                          if (line.startsWith('- ')) return <li key={li} className={cn('text-sm my-0.5', msg.role === 'user' ? 'text-white/90' : '')}>{line.slice(2)}</li>;
                          if (line.startsWith('| ')) return <p key={li} className={cn('text-xs font-mono my-0.5', msg.role === 'user' ? 'text-white/90' : '')}>{line}</p>;
                          if (line.startsWith('**') && line.endsWith('**')) return <strong key={li} className={msg.role === 'user' ? 'text-white' : ''}>{line.slice(2, -2)}</strong>;
                          if (line === '---') return <hr key={li} className="my-2 border-border/50" />;
                          if (line.trim() === '') return <br key={li} />;
                          return <p key={li} className={cn('text-sm my-0.5', msg.role === 'user' ? 'text-white/90' : '')}>{line}</p>;
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={cn(
                      'flex items-center gap-2 mt-1',
                      msg.role === 'user' ? 'justify-end' : ''
                    )}>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyMessage(msg)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-primary/10 text-primary">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-card/50 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2">
                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="向贞德提问..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-40 overflow-y-auto"
                  style={{ minHeight: '48px', maxHeight: '160px' }}
                />
                {/* Send button */}
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="default"
                  className="shrink-0 gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                按 Enter 发送，Shift + Enter 换行。贞德将尽力提供准确的学术回答。
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

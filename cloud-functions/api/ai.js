/**
 * AI 对话 API (Cloud Functions)
 * POST /api/ai/chat - 发送消息并接收 AI 回复 (SSE 流式)
 */
const AI_API_KEY = EdgeOne.env.get('AI_API_KEY') || '';
const AI_API_URL = EdgeOne.env.get('AI_API_URL') || 'https://api.openai.com/v1/chat/completions';

export default {
  async fetch(request) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const { message, conversationId, context } = body;

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 系统提示
      const systemPrompt = `你是一个专业的学术研究助手，专注于帮助研究人员管理和理解学术文献。
你的职责包括：
1. 帮助用户理解学术论文的核心内容和贡献
2. 提供研究方法论的建议
3. 协助分析图神经网络、异质图神经网络等前沿技术
4. 解答学术写作和文献综述相关问题

请用简洁、专业但易于理解的语言回复。如果不确定某些信息，请明确告知。`;

      // 如果没有 API Key，返回模拟响应
      if (!AI_API_KEY) {
        const mockResponse = `您好！我是 Joan 学术助手。

关于您的提问："${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"

我可以为您提供以下帮助：

1. **文献理解** - 帮助您分析论文的核心观点、方法论和贡献
2. **研究建议** - 提供研究方向的建议和最新进展
3. **技术解答** - 解答关于 GNN、HGNN 等技术的疑问
4. **写作指导** - 协助学术论文的撰写和润色

请告诉我您具体想了解的内容，我会尽力为您提供专业的学术支持。`;

        // 创建 SSE 流式响应
        const encoder = new TextEncoder();
        const mockStream = new ReadableStream({
          async start(controller) {
            const words = mockResponse.split('');
            for (const word of words) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word, done: false })}\n\n`));
              await new Promise(r => setTimeout(r, 10));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: 'mock-' + Date.now() })}\n\n`));
            controller.close();
          }
        });

        return new Response(mockStream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // 调用真实 AI API
      const aiResponse = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(context ? [{ role: 'assistant', content: context }] : []),
            { role: 'user', content: message }
          ],
          stream: true
        })
      });

      if (!aiResponse.ok) {
        const error = await aiResponse.text();
        console.error('[AI/Chat] API Error:', error);
        return new Response(JSON.stringify({ error: 'AI service error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 转换 OpenAI SSE 为标准 SSE
      const stream = new ReadableStream({
        async start(controller) {
          const reader = aiResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
                  } else {
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) {
                        controller.enqueue(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                      }
                    } catch (e) {
                      // 忽略解析错误
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('[AI/Chat] Stream error:', e);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } catch (e) {
      console.error('[AI/Chat] Error:', e);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

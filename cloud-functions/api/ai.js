/**
 * AI 对话 API (Cloud Functions)
 * POST /api/ai/chat - 发送消息并接收 AI 回复 (SSE 流式)
 */
const AI_API_KEY = EdgeOne.env.get('AI_API_KEY') || '';
const AI_API_URL = EdgeOne.env.get('AI_API_URL') || 'https://api.openai.com/v1/chat/completions';
const JWT_SECRET = EdgeOne.env.get('JWT_SECRET') || 'academic-hub-default-secret-key-2026';

// JWT 验证
function extractToken(request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

// JWT 签名验证
async function verifyJwtSignature(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign', 'verify']
    );

    const signatureInput = `${parts[0]}.${parts[1]}`;
    const signature = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    while (signature.length % 4) signature += '=';

    const sigBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const dataBuffer = encoder.encode(signatureInput);

    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, sigBuffer, dataBuffer);
    if (!isValid) return null;

    // 检查过期时间
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // JWT 认证检查（完整签名验证）
    const token = extractToken(request);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const payload = await verifyJwtSignature(token);
    if (!payload || !payload.userId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};

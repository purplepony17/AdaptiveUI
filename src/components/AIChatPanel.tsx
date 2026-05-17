import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are Haven's AI reading assistant, built into a neurodivergent accessibility tool. 
You help users understand, simplify, and navigate web content they are currently reading.

IMPORTANT RULES:
- Only answer questions about the content the user is reading or about Haven's features
- If asked something completely off-topic (sports scores, recipes, general trivia unrelated to the current context), respond with: "I'm here to help you with what you're reading and Haven's features. For other topics, try a search engine!"
- Keep answers short, clear, and jargon-free — max 3 sentences unless steps are needed
- Never use bullet points with more than 5 items
- Always be encouraging and calm`

export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I can help you understand what you\'re reading, simplify text, or answer questions about Haven. What would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    // Try to get key from localStorage
    const key = localStorage.getItem('haven_openai_key') || ''
    setOpenaiKey(key)
  }, [])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      let answer = ''
      if (openaiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: q }
            ]
          })
        })
        const data = await res.json()
        answer = data.choices?.[0]?.message?.content || 'Sorry, no response.'
      } else {
        // Helpful fallback without API key
        const lower = q.toLowerCase()
        if (lower.includes('focus') || lower.includes('mode')) {
          answer = 'Focus mode dims everything around the main content area so you can concentrate. Toggle it with Alt+F or from the extension popup.'
        } else if (lower.includes('timer') || lower.includes('pomodoro')) {
          answer = 'The Pomodoro timer helps you work in focused 25-minute bursts with 5-minute breaks. Start it from the Pomodoro section or with Alt+T in the extension.'
        } else if (lower.includes('theme') || lower.includes('color')) {
          answer = 'You can choose from 6 color themes including dark modes. Go to Themes in the sidebar, or change it instantly from the extension\'s Theme tab.'
        } else {
          answer = 'To get AI-powered answers, add your OpenAI API key in settings below. Without it, I can only help with basic Haven questions!'
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not connect. Check your internet connection.' }])
    } finally {
      setLoading(false)
    }
  }

  function saveKey(key: string) {
    setOpenaiKey(key)
    localStorage.setItem('haven_openai_key', key)
    setShowKeyInput(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 12,
        background: 'var(--bg)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border-mid)', marginBottom: 12,
        maxHeight: 400,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              color: m.role === 'user' ? 'white' : 'var(--text)',
              border: m.role === 'assistant' ? '1px solid var(--border-mid)' : 'none',
              fontSize: 14, lineHeight: 1.5,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--surface)', border: '1px solid var(--border-mid)',
              display: 'flex', gap: 4, alignItems: 'center'
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: `bounce 1s ease-in-out ${i*0.15}s infinite`
                }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about what you're reading..."
          disabled={loading}
          style={{
            flex: 1, padding: '11px 14px',
            border: '1.5px solid var(--border-mid)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            fontFamily: 'var(--font-body)',
            fontSize: 14, color: 'var(--text)', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ flexShrink: 0, padding: '11px 20px' }}
        >
          Send
        </button>
      </div>

      {/* API key section */}
      <div style={{ marginTop: 10 }}>
        {!showKeyInput ? (
          <button
            onClick={() => setShowKeyInput(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-soft)',
              fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
              fontFamily: 'var(--font-body)', padding: 0,
            }}>
            {openaiKey ? '✓ OpenAI key saved — click to update' : '+ Add OpenAI key for AI-powered responses'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              type="password"
              placeholder="sk-proj-..."
              defaultValue={openaiKey}
              id="key-input"
              style={{
                flex: 1, padding: '8px 12px',
                border: '1.5px solid var(--border-mid)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-body)',
                fontSize: 13, color: 'var(--text)', outline: 'none',
              }}
            />
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => {
                const val = (document.getElementById('key-input') as HTMLInputElement).value
                saveKey(val)
              }}>Save</button>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => setShowKeyInput(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

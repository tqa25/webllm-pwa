import React, { useState } from 'react'

type Props = {
  messages: { role: string; content: string }[]
  onSend: (text: string) => void
}

/**
 * ChatUI: simple ChatGPT-like UI component.
 * - messages: array of {role, content}
 * - onSend: callback when user submits
 *
 * This component is intentionally simple and mobile-friendly.
 */
export default function ChatUI({ messages, onSend }: Props){
  const [input, setInput] = useState('')

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div style={{flex:1, overflowY:'auto', padding:8}}>
        {messages.map((m, i) => (
          <div key={i} style={{display:'flex', margin:'6px 0', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth:'78%',
              padding:'10px 12px',
              borderRadius:10,
              background: m.role === 'user' ? 'linear-gradient(180deg,#063b5a,#024459)' : 'linear-gradient(180deg,#07192a,#06202a)',
              color: m.role === 'user' ? '#e6fbff' : '#dbe7ff'
            }}>
              <div style={{fontSize:14, whiteSpace:'pre-wrap'}}>{m.content}</div>
              <div style={{fontSize:12, opacity:0.6, marginTop:6}}>{m.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex', gap:8, paddingTop:8}}>
        <input
          className="input"
          placeholder="Hỏi gì đó..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key === 'Enter'){ onSend(input); setInput('') } }}
        />
        <button onClick={() => { if(input.trim()){ onSend(input); setInput('') }}}>Gửi</button>
      </div>
    </div>
  )
}

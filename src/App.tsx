import React, { useEffect, useRef, useState } from 'react'
import ChatUI from './components/ChatUI'

/**
 * App.tsx
 * - Main React component
 * - Manages Worker lifecycle and UI state
 * - Uses a Web Worker to run the WebLLM engine so the UI stays responsive on mobile.
 */

type Msg = { role: 'user'|'assistant'|'system', content: string }

export default function App(){
  const workerRef = useRef<Worker|undefined>(undefined)
  const [messages, setMessages] = useState<Msg[]>([{role:'system', content:'Sẵn sàng. Nhập để bắt đầu.'}])
  const [status, setStatus] = useState('Khởi tạo...')
  const [progress, setProgress] = useState(0)

  useEffect(()=>{
    // Start the worker (module type so we can use ESM import inside worker)
    workerRef.current = new Worker(new URL('./worker/webllm.worker.ts', import.meta.url), { type:'module' })
    workerRef.current.onmessage = (e) => {
      const data = e.data
      if(data.type === 'log') {
        setMessages(m => [...m, { role:'system', content: String(data.text) }])
      } else if(data.type === 'progress'){
        setProgress(data.progress ?? 0)
      } else if(data.type === 'ready'){
        setStatus('Engine sẵn sàng')
        setMessages(m => [...m, { role:'system', content: 'Engine sẵn sàng' }])
      } else if(data.type === 'response_chunk'){
        // append chunk (streaming)
        setMessages(m => [...m, { role:'assistant', content: data.chunk }])
      } else if(data.type === 'response_final'){
        setMessages(m => [...m, { role:'assistant', content: data.text }])
      } else if(data.type === 'webgpu'){
        setStatus(data.status)
      }
    }
    // init
    workerRef.current.postMessage({ type:'init' })
    return ()=> workerRef.current?.terminate()
  },[])

  const send = (text: string) => {
    setMessages(m => [...m, { role:'user', content: text }])
    workerRef.current?.postMessage({ type:'prompt', prompt: text })
  }

  return (
    <div className="app">
      <header>
        <h1>WebLLM PWA</h1>
        <div className="status" style={{marginLeft:'auto'}}>{status}</div>
      </header>
      <main>
        <div className="chat-column">
          <ChatUI messages={messages} onSend={send} />
        </div>
      </main>
      <div style={{padding:'12px'}}>
        <div className="progress"><i style={{width: `${Math.round(progress*100)}%`}} /></div>
      </div>
    </div>
  )
}

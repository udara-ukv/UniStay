import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';

type Msg = { from: 'user' | 'bot'; text: string };

export default function ChatWidget(){
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(()=>{ if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { from: 'user' as const, text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    try {
      const res = await chatAPI.send({ message: text });
      const data = res.data;
      if (data.type === 'listings'){
        const botText = data.message;
        setMessages(m => [...m, { from: 'bot', text: botText }]);
        data.results.forEach((r: any) => {
          setMessages(m => [...m, { from: 'bot', text: `${r.title} — Rs.${r.rent} • ${r.location} (ID:${r.id})` }]);
        });
      } else {
        setMessages(m => [...m, { from: 'bot', text: data.message }]);
      }
    } catch (err: any) {
      setMessages(m => [...m, { from: 'bot', text: 'Sorry, chat service is unavailable.' }]);
    }
  };

  return (
    <div style={{position:'fixed',right:20,bottom:20,zIndex:60}}>
      {open ? (
        <div style={{width:320,height:420,boxShadow:'0 6px 24px rgba(0,0,0,0.15)',borderRadius:8,overflow:'hidden',background:'#fff',display:'flex',flexDirection:'column'}}>
          <div style={{padding:12,background:'#111827',color:'#fff',fontWeight:700,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>Chat Assistant</div>
            <button onClick={()=>setOpen(false)} style={{background:'transparent',color:'#fff',border:0}}>✕</button>
          </div>
          <div ref={scrollRef} style={{flex:1,padding:12,overflowY:'auto'}}>
            {messages.map((m,i)=>(
              <div key={i} style={{marginBottom:8,display:'flex',justifyContent: m.from==='user' ? 'flex-end' : 'flex-start'}}>
                <div style={{maxWidth:'78%',padding:'8px 10px',borderRadius:8,background: m.from==='user' ? '#111827' : '#f3f4f6',color: m.from==='user' ? '#fff' : '#111'}}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{padding:8,borderTop:'1px solid #eee',display:'flex',gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') send(); }} placeholder='Ask about listings e.g. "show listings near Homagama"' style={{flex:1,padding:'8px 10px',borderRadius:6,border:'1px solid #ddd'}} />
            <button onClick={send} className='btn btn-primary btn-sm'>Send</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} style={{width:56,height:56,borderRadius:'50%',background:'#111827',color:'#fff',border:0,boxShadow:'0 6px 18px rgba(0,0,0,0.15)'}}>💬</button>
      )}
    </div>
  );
}

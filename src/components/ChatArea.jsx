import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Paperclip, Camera, Mic, Video, Send, 
  Trash2, Play, ChevronLeft, Volume2 
} from 'lucide-react';

export default function ChatArea({ selectedUser, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordMode, setRecordMode] = useState('voice'); // 'voice' or 'video'
  const [recSeconds, setRecSeconds] = useState(0);
  const [showCapture, setShowCapture] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // {x, y, msg}
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const captureVideoRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    const subscription = supabase
      .channel(`chat:${selectedUser.username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new;
          if ((msg.from === currentUser.username && msg.to === selectedUser.username) ||
              (msg.from === selectedUser.username && msg.to === currentUser.username)) {
            setMessages(prev => [...prev, msg]);
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
       supabase.removeChannel(subscription);
       clearInterval(recTimerRef.current);
    };
  }, [selectedUser.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from.eq.${currentUser.username},to.eq.${selectedUser.username}),and(from.eq.${selectedUser.username},to.eq.${currentUser.username})`)
      .order('ts', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (type = 'text', mediaUrl = null) => {
    const text = inputValue.trim();
    if (!text && !mediaUrl) return;

    const msg = {
      from: currentUser.username,
      to: selectedUser.username,
      text: type === 'text' ? text : '',
      ts: Date.now(),
      type,
      media_url: mediaUrl
    };

    setInputValue('');
    const { error } = await supabase.from('messages').insert([msg]);
    if (error) console.error('Send error:', error);
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const isCirc = recordMode === 'video';
      const constraints = isCirc ? { audio: true, video: { width: 400, height: 400 } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setIsRecording(true);
      chunksRef.current = [];
      setRecSeconds(0);

      if (isCirc && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const types = isCirc 
        ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType });
          const reader = new FileReader();
          reader.onload = (ev) => sendMessage(isCirc ? 'circular' : 'voice', ev.target.result);
          reader.readAsDataURL(blob);
        }
        setIsRecording(false);
      };

      mr.start(100);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (err) {
      alert('Access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(recTimerRef.current);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setShowCapture(true);
      if (captureVideoRef.current) captureVideoRef.current.srcObject = stream;
    } catch (err) { alert('Camera error'); }
  };

  const snapPhoto = () => {
    const video = captureVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    sendMessage('image', canvas.toDataURL('image/jpeg'));
    closeCapture();
  };

  const closeCapture = () => {
    const stream = captureVideoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    setShowCapture(false);
  };

  const deleteMessage = async (id) => {
    await supabase.from('messages').delete().eq('id', id);
    setContextMenu(null);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="active-chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header">
        <button className="btn-icon btn-back" onClick={onBack}><ChevronLeft size={20}/></button>
        <div className="avatar">{(selectedUser.name[0] + (selectedUser.name.split(' ')[1]?.[0] || '')).toUpperCase()}</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{selectedUser.name}</div>
          <div className="chat-header-status">online</div>
        </div>
      </div>

      <div className="messages-area" onContextMenu={(e) => e.preventDefault()}>
        {messages.map(m => (
          <div key={m.id || m.ts} className={`msg-row ${m.from === currentUser.username ? 'me' : 'them'}`}>
            <div className="bubble" onContextMenu={(e) => {
              if (m.from === currentUser.username) {
                setContextMenu({ x: e.pageX, y: e.pageY, id: m.id });
              }
            }}>
              {m.type === 'text' && <span>{m.text}</span>}
              {m.type === 'image' && <img src={m.media_url} className="bubble-img" alt="media" onClick={() => window.open(m.media_url)} />}
              {m.type === 'video' && <video src={m.media_url} className="bubble-video" controls />}
              {m.type === 'voice' && (
                <div className="bubble-voice">
                   <button className="btn-play" onClick={() => new Audio(m.media_url).play()}><Play size={14}/></button>
                   <div className="voice-info">
                     <div className="voice-label">Voice Message</div>
                     <div className="voice-duration">{formatTime(m.ts)}</div>
                   </div>
                </div>
              )}
              {m.type === 'circular' && (
                <div className="circular-container" onClick={(e) => {
                  const v = e.currentTarget.querySelector('video');
                  v.muted = !v.muted;
                  e.currentTarget.classList.toggle('unmuted', !v.muted);
                }}>
                   <video src={m.media_url} className="circular-video" autoPlay loop muted playsInline />
                   <div className="circular-hint">Tap to unmute</div>
                   <div className="circular-sound-icon"><Volume2 size={12}/></div>
                </div>
              )}
              <div className="bubble-time">{formatTime(m.ts)}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y, display: 'block' }}>
          <button className="menu-item delete" onClick={() => deleteMessage(contextMenu.id)}>
            <Trash2 size={14} style={{ marginRight: '8px' }}/> Delete Message
          </button>
        </div>
      )}
      {contextMenu && <div className="menu-overlay" onClick={() => setContextMenu(null)} />}

      <div className="chat-input-area">
        <button className="btn-icon" onClick={() => document.getElementById('media-picker').click()}><Paperclip size={20}/></button>
        <button className="btn-icon" onClick={openCamera}><Camera size={20}/></button>
        <input 
          type="file" id="media-picker" className="hidden" accept="image/*,video/*" 
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => sendMessage(file.type.startsWith('image/') ? 'image' : 'video', ev.target.result);
            reader.readAsDataURL(file);
          }}
        />

        {!isRecording ? (
          <input 
            type="text" id="msg-input" placeholder="Type a message..." 
            value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
        ) : (
          <div className="recording-overlay">
            <div id="recording-dot" className="recording-dot"></div>
            <span id="recording-timer">{Math.floor(recSeconds/60)}:{String(recSeconds%60).padStart(2,'0')}</span>
            <div id="recording-cancel" className="recording-cancel">Recording...</div>
          </div>
        )}

        {inputValue.trim() ? (
          <button className="btn-send" onClick={() => sendMessage()}><Send size={20}/></button>
        ) : (
          <button 
           className={`btn-icon ${isRecording ? 'recording' : ''}`}
           onMouseDown={() => { this.timer = setTimeout(startRecording, 200); }}
           onMouseUp={() => { clearTimeout(this.timer); if(isRecording) stopRecording(); }}
           onMouseLeave={() => { clearTimeout(this.timer); if(isRecording) stopRecording(); }}
           onClick={() => !isRecording && setRecordMode(prev => prev === 'voice' ? 'video' : 'voice')}
          >
            {recordMode === 'voice' ? <Mic size={20} /> : <Video size={20} />}
            {isRecording && recordMode === 'video' && (
              <div className="circular-preview">
                <video ref={videoPreviewRef} autoPlay muted playsInline />
              </div>
            )}
          </button>
        )}
      </div>

      {showCapture && (
        <div className="capture-overlay">
          <div className="capture-card">
            <video ref={captureVideoRef} autoPlay playsInline />
            <div className="capture-actions">
              <button className="btn-primary" onClick={snapPhoto}>Snap Photo</button>
              <button className="btn-icon" onClick={closeCapture}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

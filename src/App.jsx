import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { Menu } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('pulse_current') || 'null'));
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('pulse-theme') || 'dark');
  const [unreads, setUnreads] = useState({});
  const [recentConvs, setRecentConvs] = useState([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    localStorage.setItem('pulse-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      initRealtime();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser) {
      setUnreads(prev => {
        if (!prev[selectedUser.username]) return prev;
        const next = { ...prev };
        delete next[selectedUser.username];
        return next;
      });
      // Close sidebar on mobile when a user is selected
      if (window.innerWidth <= 850) setIsSidebarOpen(false);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('username, name');
    if (data) setUsers(data);
  };

  const initRealtime = () => {
    supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new;
        if (msg.to === currentUser.username || msg.from === currentUser.username) {
           handleNewMessage(msg);
        }
      })
      .subscribe();
  };

  const selectedUserRef = useRef(null);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const handleNewMessage = (msg) => {
    const other = msg.from === currentUser.username ? msg.to : msg.from;
    setRecentConvs(prev => {
      const filtered = prev.filter(u => u !== other);
      return [other, ...filtered];
    });
    // Check unreads if not active
    if (selectedUserRef.current?.username !== other && msg.from !== currentUser.username) {
       setUnreads(prev => ({ ...prev, [other]: (prev[other] || 0) + 1 }));
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('pulse_current', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pulse_current');
  };

  if (!currentUser) return <Auth onLogin={handleLogin} />;

  return (
    <div id="app-screen" className="screen active">
      <Sidebar 
        users={users} 
        currentUser={currentUser} 
        onSelectUser={setSelectedUser} 
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        unreads={unreads}
        recentConvs={recentConvs}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {isSidebarOpen && window.innerWidth <= 850 && (
        <div className="sidebar-overlay" style={{ display: 'block' }} onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <div id="chat-area" className="chat-area">
        {!selectedUser ? (
          <div id="empty-state" className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', position: 'relative' }}>
             <button className="btn-icon" style={{ position: 'absolute', top: '16px', left: '16px' }} onClick={() => setIsSidebarOpen(true)}>
               <Menu size={20} />
             </button>
             <div style={{ opacity: 0.3, marginBottom: '20px' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.2 8.38 8.38 0 013.8.9L21 3z" />
                </svg>
             </div>
             <h3>Pulse Messenger</h3>
             <p>Select a chat to start messaging.</p>
          </div>
        ) : (
          <ChatArea 
            selectedUser={selectedUser} 
            currentUser={currentUser} 
            onBack={() => {
              setSelectedUser(null);
              setIsSidebarOpen(true);
            }} 
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        )}
      </div>
    </div>
  );
}

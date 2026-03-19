import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

export default function App() {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('pulse_current') || 'null'));
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('pulse-theme') || 'dark');
  const [unreads, setUnreads] = useState({});
  const [recentConvs, setRecentConvs] = useState([]);

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

  const handleNewMessage = (msg) => {
    const other = msg.from === currentUser.username ? msg.to : msg.from;
    setRecentConvs(prev => {
      const filtered = prev.filter(u => u !== other);
      return [other, ...filtered];
    });
    // Check unreads if not active
    if (selectedUser?.username !== other && msg.from !== currentUser.username) {
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
      />
      
      <div id="chat-area" className="chat-area">
        {!selectedUser ? (
          <div id="empty-state" className="empty-state">
             <h3>Pulse Messenger</h3>
             <p>Select a chat to start messaging.</p>
          </div>
        ) : (
          <ChatArea 
            selectedUser={selectedUser} 
            currentUser={currentUser} 
            onBack={() => setSelectedUser(null)} 
          />
        )}
      </div>
    </div>
  );
}

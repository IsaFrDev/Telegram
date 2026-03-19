import React, { useState, useEffect } from 'react';
import { Search, LogOut, Sun, Moon, X } from 'lucide-react';

export default function Sidebar({ users, currentUser, onSelectUser, onLogout, theme, toggleTheme, unreads, recentConvs }) {
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter(u => {
    if (u.username === currentUser.username) return false;
    const q = search.toLowerCase().trim().replace(/^@/, '');
    if (!q) return recentConvs.includes(u.username);
    return u.username.includes(q) || u.name.toLowerCase().includes(q);
  });

  const avatarInitials = (name) => {
    const p = name.trim().split(' ');
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  };

  return (
    <div id="sidebar" className="sidebar open">
      <div className="sidebar-header">
        <div className="logo-wrap">
          <div className="logo-icon">P</div> Pulse
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="btn-icon" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="search-area">
        <div className="search-input-wrap">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search people..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14}/></button>}
        </div>
      </div>

      <div className="user-list">
        {search === '' && recentConvs.length > 0 && <div className="list-heading">Recent Conversations</div>}
        {search !== '' && <div className="list-heading">Search Results</div>}
        {filteredUsers.map(u => (
          <div key={u.username} className="user-item" onClick={() => onSelectUser(u)}>
            <div className="avatar">{avatarInitials(u.name)}</div>
            <div className="user-item-info">
              <div className="user-item-name">{u.name}</div>
              <div className="user-item-username">@{u.username}</div>
            </div>
            {unreads[u.username] > 0 && <div className="unread-badge">{unreads[u.username]}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

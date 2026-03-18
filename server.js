const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Explicit route for index.html (important for Vercel)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Users and Messages (simplified for this demo)
let users = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
  users = JSON.parse(data);
} catch (err) {
  console.error('Error reading users.json:', err);
}

// In-memory message store and persistence
let messages = {}; 
try {
  if (fs.existsSync(path.join(__dirname, 'messages.json'))) {
    const msgData = fs.readFileSync(path.join(__dirname, 'messages.json'), 'utf8');
    messages = JSON.parse(msgData);
  } else {
    fs.writeFileSync(path.join(__dirname, 'messages.json'), '{}');
  }
} catch (err) {
  console.error('Error reading messages.json:', err);
}

let unreadCounts = {}; // username -> { fromUsername: count }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (username) => {
    socket.username = username;
    socket.join(username);
    console.log(`${username} joined their private room.`);
  });

  socket.on('get_messages', (key) => {
    // Return historical messages for a specific conversation key
    socket.emit('history', { key, msgs: messages[key] || [] });
  });

  socket.on('get_conversations', (username) => {
    // Find all users the current user has chatted with
    const conversationPartners = [];
    Object.keys(messages).forEach(key => {
      const parts = key.split('::');
      if (parts.includes(username)) {
        const partner = parts.find(p => p !== username);
        if (partner) conversationPartners.push(partner);
      }
    });
    socket.emit('conversations_list', conversationPartners);
  });

  socket.on('delete_message', (data) => {
    const { key, ts, to } = data;
    if (messages[key]) {
      messages[key] = messages[key].filter(m => m.ts !== ts);
      saveMessagesToJson(messages);
      
      // Broadcast globally for deletion to ensure it's felt everywhere
      io.emit('message_deleted', { key, ts });
    }
  });

  socket.on('signup', (newUser) => {
    // Check if user already exists in memory
    if (users.find(u => u.username === newUser.username)) {
      socket.emit('signup_error', 'Username already taken.');
      return;
    }

    users.push(newUser);
    saveUsersToJson(users);
    
    // Broadcast to everyone so they can update their local searchable list
    io.emit('user_added', { username: newUser.username, name: newUser.name });
    
    console.log(`New user signed up: ${newUser.username}`);
    socket.emit('signup_success', newUser);
  });

  socket.on('send_message', (data) => {
    const { from, to, text, ts, type = 'text', mediaUrl = null } = data;
    const key = [from, to].sort().join('::');
    
    if (!messages[key]) messages[key] = [];
    messages[key].push({ from, text, ts, type, mediaUrl });
    saveMessagesToJson(messages);

    // Send to the recipient
    io.to(to).emit('receive_message', { from, text, ts, type, mediaUrl });
    
    // Update unread count if recipient is not in the chat
    io.to(to).emit('unread_update', { from, count: 1 });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

function saveUsersToJson(usersList) {
  try {
    fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(usersList, null, 2));
  } catch (err) {
    console.error('Failed to save users.json:', err);
  }
}

function saveMessagesToJson(messagesStore) {
  try {
    fs.writeFileSync(path.join(__dirname, 'messages.json'), JSON.stringify(messagesStore, null, 2));
  } catch (err) {
    console.error('Failed to save messages.json:', err);
  }
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

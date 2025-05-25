
// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');

// const app = express();
// app.use(cors());
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: ['http://localhost:3000', 'http://localhost:3001'],
//     methods: ["GET", "POST"]
//   }
// });

// const CHAT_HISTORY_FILE = path.join(__dirname, 'chat_history.json');

// // Initialize chat history file if it doesn't exist or is invalid
// function initializeChatFile() {
//   try {
//     if (!fs.existsSync(CHAT_HISTORY_FILE)) {
//       fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([], null, 2));
//       console.log('Created new chat history file');
//     } else {
//       // Verify the existing file contains valid JSON array
//       const content = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
//       if (!content.trim().startsWith('[')) {
//         fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([], null, 2));
//         console.log('Reset invalid chat history file');
//       }
//     }
//   } catch (err) {
//     console.error('Error initializing chat history file:', err);
//     try {
//       fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([], null, 2));
//     } catch (writeErr) {
//       console.error('Failed to create chat history file:', writeErr);
//     }
//   }
// }

// initializeChatFile();

// let chatRequest = null;
// let activeChat = null;

// function saveChatMessage(messageData) {
//   let chatData = [];
//   try {
//     const fileContent = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
//     chatData = fileContent ? JSON.parse(fileContent) : [];
//     if (!Array.isArray(chatData)) {
//       console.warn('Chat data is not an array, resetting...');
//       chatData = [];
//     }
//   } catch (err) {
//     console.error('Error reading chat history file:', err);
//     chatData = [];
//   }

//   chatData.push({
//     ...messageData,
//     timestamp: new Date().toISOString(),
//     chatId: activeChat ? `${activeChat.userId}-${activeChat.agentId}` : 'no-active-chat'
//   });

//   try {
//     fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatData, null, 2));
//   } catch (err) {
//     console.error('Error writing to chat history file:', err);
//   }
// }

// io.on('connection', (socket) => {
//   console.log('New client connected:', socket.id);

//   // User requests chat
//   socket.on('requestChat', () => {
//     chatRequest = { userId: socket.id };
//     io.emit('newChatRequest'); // Notify all agents
//     saveChatMessage({
//       sender: 'system',
//       text: 'Chat requested',
//       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//       from: socket.id,
//       to: 'all-agents'
//     });
//   });

//   // Agent accepts chat
//   socket.on('acceptChat', (agentId) => {
//     if (chatRequest) {
//       activeChat = {
//         userId: chatRequest.userId,
//         agentId: agentId
//       };
//       io.to(chatRequest.userId).emit('chatStarted');
//       io.to(agentId).emit('chatStarted');
      
//       saveChatMessage({
//         sender: 'system',
//         text: 'Chat started',
//         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         from: agentId,
//         to: chatRequest.userId
//       });
      
//       chatRequest = null;
//     }
//   });

//   // Send message
//   socket.on('sendMessage', ({ sender, text, time }) => {
//     if (activeChat) {
//       const receiver = sender === 'user' ? activeChat.agentId : activeChat.userId;
//       const messageData = {
//         sender,
//         text,
//         time,
//         from: socket.id,
//         to: receiver
//       };
//       saveChatMessage(messageData);
//       io.to(receiver).emit('receiveMessage', { sender, text, time });
//     }
//   });

//   // End chat
//   socket.on('endChat', () => {
//     if (activeChat) {
//       io.to(activeChat.userId).emit('chatEnded');
//       io.to(activeChat.agentId).emit('chatEnded');
      
//       saveChatMessage({
//         sender: 'system',
//         text: 'Chat ended',
//         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         from: 'system',
//         to: 'both'
//       });
      
//       activeChat = null;
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', socket.id);
//     if (activeChat && (socket.id === activeChat.userId || socket.id === activeChat.agentId)) {
//       io.to(activeChat.userId).emit('chatEnded');
//       io.to(activeChat.agentId).emit('chatEnded');
      
//       saveChatMessage({
//         sender: 'system',
//         text: 'Chat ended (client disconnected)',
//         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         from: 'system',
//         to: 'both'
//       });
      
//       activeChat = null;
//     }
//   });
// });

// const PORT = 5001;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const cors = require('cors');
const socketIo = require('socket.io');

 app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: ['https://wflivechatuser.netlify.app', 'https://wflivechat.netlify.app'],
    methods: ["GET", "POST"]
  }
});


let users = {};
let agents = {};
let requests = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('User connected');

  // Store user socket ID
  socket.on('join-user', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} joined with socket ID ${socket.id}`);
  });

  // Store agent socket ID
  socket.on('join-agent', (agentId) => {
    agents[agentId] = socket.id;
    console.log(`Agent ${agentId} joined with socket ID ${socket.id}`);
  });

  // Send request
  socket.on('send-request', (data) => {
    requests[data.userId] = data.agentId;
    io.to(agents[data.agentId]).emit('new-request', data);
  });

  // Accept request
  socket.on('accept-request', (data) => {
    io.to(users[data.userId]).emit('request-accepted', data);
  });

  // Send message
  socket.on('send-message', (message) => {
    if (message.sender === 'user') {
      io.to(agents[message.receiver]).emit('new-message', message);
    } else {
      io.to(users[message.receiver]).emit('new-message', message);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');

    // Remove user socket ID
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
      }
    }

    // Remove agent socket ID
    for (const agentId in agents) {
      if (agents[agentId] === socket.id) {
        delete agents[agentId];
      }
    }
  });
});

server.listen(5001, () => {
  console.log('Backend Server listening on my port 5001');
});




const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "https://chathut.net"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory session store (for dev)
const sessions = {};

// Helper to get or create a WhatsApp client for a session
function getClient(sessionId) {
  if (!sessions[sessionId]) {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });
    sessions[sessionId] = {
      client,
      qr: null,
      ready: false,
      chats: [],
      messages: {},
    };
    setupClient(sessionId, client);
  }
  return sessions[sessionId];
}

function setupClient(sessionId, client) {
  client.on('qr', (qr) => {
    sessions[sessionId].qr = qr;
    sessions[sessionId].ready = false;
    qrcode.toDataURL(qr, (err, url) => {
      if (!err) {
        sessions[sessionId].qrImage = url;
      }
    });
    io.to(sessionId).emit('qr', { qr });
    console.log(`[${sessionId}] QR generated`);
  });

  client.on('ready', async () => {
    sessions[sessionId].ready = true;
    sessions[sessionId].qr = null;
    sessions[sessionId].qrImage = null;
    io.to(sessionId).emit('ready', { message: 'WhatsApp client is ready' });
    console.log(`[${sessionId}] WhatsApp client is ready`);
    // Preload chats
    const chats = await client.getChats();
    sessions[sessionId].chats = chats;
  });

  client.on('authenticated', () => {
    console.log(`[${sessionId}] Authenticated`);
  });

  client.on('auth_failure', (msg) => {
    console.log(`[${sessionId}] Auth failure:`, msg);
    sessions[sessionId].ready = false;
    sessions[sessionId].qr = null;
    sessions[sessionId].qrImage = null;
    io.to(sessionId).emit('auth_failure', { message: msg });
  });

  client.on('message', (msg) => {
    console.log(`[${sessionId}] New message received:`, {
      from: msg.from,
      to: msg.to,
      body: msg.body,
      fromMe: msg.fromMe
    });
    
    // Store messages in memory
    if (!sessions[sessionId].messages[msg.from]) {
      sessions[sessionId].messages[msg.from] = [];
    }
    sessions[sessionId].messages[msg.from].push(msg);
    
    // Format message for frontend
    const formattedMessage = {
      id: msg.id._serialized,
      chatId: msg.from, // The chat this message belongs to
      from: msg.from,
      to: msg.to,
      text: msg.body || '',
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      isOutgoing: msg.fromMe,
      type: msg.type || 'chat',
      source: 'whatsapp'
    };
    
    // Emit to all clients in this session
    io.to(sessionId).emit('new_message', formattedMessage);
    console.log(`[${sessionId}] Emitted new_message event for chat ${msg.from}`);
  });

  client.on('disconnected', async (reason) => {
    console.log(`[${sessionId}] Disconnected:`, reason);
    io.to(sessionId).emit('disconnected', { reason });

    // Clean up the existing client entirely to avoid corrupted state
    try {
      await client.destroy();
    } catch (err) {
      console.warn(`[${sessionId}] Error during client.destroy():`, err?.message || err);
    }

    // Remove the session so that the next /connect call creates a fresh one (which will trigger a new QR)
    delete sessions[sessionId];
  });
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// API Endpoints
app.post('/whatsapp/connect', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, error: 'Session ID required' });
  const session = getClient(sessionId);
  if (!session.client.info || !session.ready) {
    try {
      await session.client.initialize();
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }
  res.json({ success: true, sessionId, qrCode: session.qrImage || null });
});

app.get('/whatsapp/status', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) return res.json({ success: false, isReady: false });
  res.json({ success: true, isReady: sessions[sessionId].ready });
});

app.get('/whatsapp/chats', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) return res.status(400).json({ success: false, error: 'Session not found' });
  try {
    if (!sessions[sessionId].ready) {
      return res.status(400).json({ success: false, error: 'Client not ready' });
    }
    const chats = await sessions[sessionId].client.getChats();
    
    // Enrich chats with last message info
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      try {
        // Get the last message for this chat
        const messages = await chat.fetchMessages({ limit: 1 });
        let lastMessage = messages.length > 0 ? messages[0] : null;
        
        // Filter out system messages and empty messages
        if (lastMessage) {
          const isSystemMessage = lastMessage.type === 'system' || 
                                 lastMessage.type === 'notification' ||
                                 !lastMessage.body || 
                                 lastMessage.body.trim() === '';
          
          if (isSystemMessage) {
            console.log(`Filtering out system/empty message for "${chat.name}":`, {
              type: lastMessage.type,
              body: lastMessage.body,
              bodyLength: lastMessage.body?.length
            });
            lastMessage = null; // Treat as no message
          }
        }
        
        // Debug: Log message details for groups
        if (chat.isGroup && lastMessage) {
          console.log(`Group "${chat.name}" has REAL message:`, {
            body: lastMessage.body,
            type: lastMessage.type,
            fromMe: lastMessage.fromMe,
            timestamp: lastMessage.timestamp
          });
        }
        
        return {
          id: chat.id._serialized,
          name: chat.name,
          isGroup: chat.isGroup,
          timestamp: chat.timestamp,
          unreadCount: chat.unreadCount || 0,
          archived: chat.archived || false,
          pinned: chat.pinned || false,
          lastMessage: lastMessage ? {
            text: lastMessage.body || '',
            date: new Date(lastMessage.timestamp * 1000).toISOString(),
            fromMe: lastMessage.fromMe,
            type: lastMessage.type
          } : null
        };
      } catch (error) {
        console.error(`Error fetching last message for chat ${chat.id._serialized}:`, error);
        // Return chat without last message if there's an error
        return {
          id: chat.id._serialized,
          name: chat.name,
          isGroup: chat.isGroup,
          timestamp: chat.timestamp,
          unreadCount: chat.unreadCount || 0,
          archived: chat.archived || false,
          pinned: chat.pinned || false,
          lastMessage: null
        };
      }
    }));
    
    // Debug: Log first few chats before sorting
    console.log('=== BEFORE SORTING ===');
    enrichedChats.slice(0, 5).forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.name} (${chat.isGroup ? 'GROUP' : 'USER'})`);
      console.log(`   Has lastMessage: ${!!chat.lastMessage}`);
      console.log(`   LastMessage date: ${chat.lastMessage?.date || 'NONE'}`);
      console.log(`   Chat timestamp: ${chat.timestamp}`);
      console.log(`   Unread count: ${chat.unreadCount}`);
    });

    // Sort chats by last message timestamp (most recent first)
    // Chats with messages always come before chats without messages
    enrichedChats.sort((a, b) => {
      // Priority 1: Chats with real messages come first
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      
      // Priority 2: If both have messages, sort by message timestamp
      if (a.lastMessage && b.lastMessage) {
        const aTime = new Date(a.lastMessage.date).getTime();
        const bTime = new Date(b.lastMessage.date).getTime();
        return bTime - aTime; // Newest first
      }
      
      // Priority 3: If both have no messages, sort by unread count (chats with unread come first)
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount; // Higher unread count first
      }
      
      // Priority 4: If same unread count, sort by chat timestamp (newer chats first)
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return bTime - aTime;
    });

    // Debug: Log first few chats after sorting
    console.log('=== AFTER SORTING ===');
    enrichedChats.slice(0, 5).forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.name} (${chat.isGroup ? 'GROUP' : 'USER'})`);
      console.log(`   Has lastMessage: ${!!chat.lastMessage}`);
      console.log(`   LastMessage date: ${chat.lastMessage?.date || 'NONE'}`);
      console.log(`   Chat timestamp: ${chat.timestamp}`);
      console.log(`   Unread count: ${chat.unreadCount}`);
    });
    
    res.json({ success: true, chats: enrichedChats });
  } catch (e) {
    console.error('Error in /whatsapp/chats:', e);
    // Gracefully handle known Puppeteer evaluation errors that occur right after authentication
    const safeError = String(e.message || e);
    if (safeError.includes('getChats')) {
      console.warn('getChats failed immediately after auth, returning empty chat list instead of 500');
      return res.json({ success: true, chats: [] });
    }
    res.status(500).json({ success: false, error: safeError });
  }
});

app.get('/whatsapp/messages', async (req, res) => {
  const { sessionId, chatId, limit } = req.query;
  if (!sessionId || !chatId || !sessions[sessionId]) return res.status(400).json({ success: false, error: 'Session or chat not found' });
  try {
    if (!sessions[sessionId].ready) {
      return res.status(400).json({ success: false, error: 'Client not ready' });
    }
    
    const chat = await sessions[sessionId].client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: Number(limit) || 50 });
    
    res.json({ 
      success: true, 
      messages: messages.map(msg => ({
        id: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        timestamp: msg.timestamp * 1000, // Convert to milliseconds
        isOutgoing: msg.fromMe,
        type: msg.type
      }))
    });
  } catch (e) {
    console.error('Error in /whatsapp/messages:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/whatsapp/send', async (req, res) => {
  const { sessionId, chatId, text } = req.body;
  if (!sessionId || !chatId || !text || !sessions[sessionId]) return res.status(400).json({ success: false, error: 'Missing params' });
  try {
    // Send the message
    const sentMessage = await sessions[sessionId].client.sendMessage(chatId, text);
    
    // Manually emit new_message event for own messages since WhatsApp Web doesn't always trigger it
    const formattedMessage = {
      id: sentMessage.id._serialized,
      chatId: chatId,
      from: chatId, // For own messages, 'from' is the chat ID
      to: chatId,
      text: text,
      timestamp: new Date().toISOString(),
      isOutgoing: true, // This is our own message
      type: 'chat',
      source: 'whatsapp'
    };
    
    console.log(`[${sessionId}] Emitting new_message for own sent message in chat ${chatId}`);
    io.to(sessionId).emit('new_message', formattedMessage);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Error sending WhatsApp message:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/whatsapp/disconnect', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !sessions[sessionId]) return res.status(400).json({ success: false, error: 'Session not found' });
  try {
    await sessions[sessionId].client.destroy();
    delete sessions[sessionId];
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/health', (req, res) => {
  const sessionInfo = Object.keys(sessions).map(sessionId => ({
    sessionId,
    ready: sessions[sessionId].ready,
    hasQr: !!sessions[sessionId].qr,
    chatsCount: sessions[sessionId].chats?.length || 0
  }));
  
  res.json({
    status: 'healthy',
    activeSessions: Object.keys(sessions).length,
    sessions: sessionInfo,
    timestamp: new Date().toISOString(),
    mode: 'real'
  });
});

app.get('/debug/sessions', (req, res) => {
  res.json({
    sessions: Object.keys(sessions),
    details: Object.keys(sessions).map(sessionId => ({
      sessionId,
      ready: sessions[sessionId].ready,
      hasQr: !!sessions[sessionId].qr,
      chatsCount: sessions[sessionId].chats?.length || 0,
      messageGroups: Object.keys(sessions[sessionId].messages || {}).length
    }))
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Real WhatsApp service running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
}); 
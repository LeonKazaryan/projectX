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
    // Store messages in memory
    if (!sessions[sessionId].messages[msg.from]) {
      sessions[sessionId].messages[msg.from] = [];
    }
    sessions[sessionId].messages[msg.from].push(msg);
    io.to(sessionId).emit('message', msg);
  });

  client.on('disconnected', (reason) => {
    console.log(`[${sessionId}] Disconnected:`, reason);
    sessions[sessionId].ready = false;
    sessions[sessionId].qr = null;
    sessions[sessionId].qrImage = null;
    io.to(sessionId).emit('disconnected', { reason });
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
    res.json({ success: true, chats });
  } catch (e) {
    console.error('Error in /whatsapp/chats:', e);
    res.status(500).json({ success: false, error: e.message });
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
    await sessions[sessionId].client.sendMessage(chatId, text);
    res.json({ success: true });
  } catch (e) {
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
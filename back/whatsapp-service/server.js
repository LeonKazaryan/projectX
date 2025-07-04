const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

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

// Mock WhatsApp client manager
class MockWhatsAppManager {
  constructor() {
    this.clients = new Map();
    this.mockChats = [
      {
        id: '1234567890@c.us',
        name: 'John Doe',
        isUser: true,
        isGroup: false,
        participants: ['1234567890@c.us'],
        unreadCount: 2,
        lastMessage: {
          text: 'Hey, how are you?',
          timestamp: Date.now() - 300000
        }
      },
      {
        id: '9876543210@c.us',
        name: 'Jane Smith',
        isUser: true,
        isGroup: false,
        participants: ['9876543210@c.us'],
        unreadCount: 0,
        lastMessage: {
          text: 'Thanks for the info!',
          timestamp: Date.now() - 600000
        }
      },
      {
        id: '5551234567@c.us',
        name: 'Family Group',
        isUser: false,
        isGroup: true,
        participants: ['1234567890@c.us', '9876543210@c.us', '5551234567@c.us'],
        unreadCount: 5,
        lastMessage: {
          text: 'Dinner at 8 PM tonight!',
          timestamp: Date.now() - 120000
        }
      }
    ];
    
    this.mockMessages = new Map();
    this.initializeMockMessages();
  }

  initializeMockMessages() {
    // Mock messages for John Doe
    this.mockMessages.set('1234567890@c.us', [
      {
        id: 'msg1',
        from: '1234567890@c.us',
        text: 'Hey, how are you?',
        timestamp: Date.now() - 300000,
        isOutgoing: false
      },
      {
        id: 'msg2',
        from: 'me',
        text: 'I\'m good, thanks! How about you?',
        timestamp: Date.now() - 240000,
        isOutgoing: true
      },
      {
        id: 'msg3',
        from: '1234567890@c.us',
        text: 'Doing great! Want to grab coffee later?',
        timestamp: Date.now() - 180000,
        isOutgoing: false
      }
    ]);

    // Mock messages for Jane Smith
    this.mockMessages.set('9876543210@c.us', [
      {
        id: 'msg4',
        from: 'me',
        text: 'Here\'s the document you requested',
        timestamp: Date.now() - 600000,
        isOutgoing: true
      },
      {
        id: 'msg5',
        from: '9876543210@c.us',
        text: 'Thanks for the info!',
        timestamp: Date.now() - 600000,
        isOutgoing: false
      }
    ]);

    // Mock messages for Family Group
    this.mockMessages.set('5551234567@c.us', [
      {
        id: 'msg6',
        from: '1234567890@c.us',
        text: 'Who\'s cooking tonight?',
        timestamp: Date.now() - 300000,
        isOutgoing: false
      },
      {
        id: 'msg7',
        from: 'me',
        text: 'I can make pasta!',
        timestamp: Date.now() - 240000,
        isOutgoing: true
      },
      {
        id: 'msg8',
        from: '9876543210@c.us',
        text: 'Dinner at 8 PM tonight!',
        timestamp: Date.now() - 120000,
        isOutgoing: false
      }
    ]);
  }

  async createClient(sessionId) {
    if (this.clients.has(sessionId)) {
      return { success: false, error: 'Session already exists' };
    }

    try {
      // Simulate QR code generation
      const mockQR = `mock-qr-${sessionId}-${Date.now()}`;
      const qrCode = await qrcode.toDataURL(mockQR);
      
      // Simulate connection delay
      setTimeout(() => {
        this.clients.set(sessionId, {
          isReady: true,
          qrCode: null
        });
        
        io.to(sessionId).emit('ready', { message: 'WhatsApp client is ready (Mock)' });
        console.log(`Mock WhatsApp client ready for session: ${sessionId}`);
      }, 3000);

      this.clients.set(sessionId, {
        isReady: false,
        qrCode: qrCode
      });

      return { success: true, sessionId, qrCode };
    } catch (error) {
      console.error('Mock client creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async disconnectClient(sessionId) {
    if (this.clients.has(sessionId)) {
      this.clients.delete(sessionId);
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  }

  async getChats(sessionId) {
    const session = this.clients.get(sessionId);
    if (!session || !session.isReady) {
      return { success: false, error: 'Client not ready' };
    }

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true, chats: this.mockChats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMessages(sessionId, chatId, limit = 50) {
    const session = this.clients.get(sessionId);
    if (!session || !session.isReady) {
      return { success: false, error: 'Client not ready' };
    }

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const messages = this.mockMessages.get(chatId) || [];
      const limitedMessages = messages.slice(-limit);
      
      return { success: true, messages: limitedMessages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendMessage(sessionId, chatId, text) {
    const session = this.clients.get(sessionId);
    if (!session || !session.isReady) {
      return { success: false, error: 'Client not ready' };
    }

    try {
      // Simulate sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add message to mock data
      const newMessage = {
        id: `msg-${Date.now()}`,
        from: 'me',
        text: text,
        timestamp: Date.now(),
        isOutgoing: true
      };

      if (!this.mockMessages.has(chatId)) {
        this.mockMessages.set(chatId, []);
      }
      this.mockMessages.get(chatId).push(newMessage);

      // Update last message in chat
      const chat = this.mockChats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessage = {
          text: text,
          timestamp: Date.now()
        };
      }

      // Emit new message event
      io.to(sessionId).emit('message', newMessage);

      return { success: true, messageId: newMessage.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  isReady(sessionId) {
    const session = this.clients.get(sessionId);
    return session && session.isReady;
  }

  // Simulate incoming messages
  simulateIncomingMessage(sessionId, chatId, text) {
    const newMessage = {
      id: `incoming-${Date.now()}`,
      from: chatId,
      text: text,
      timestamp: Date.now(),
      isOutgoing: false
    };

    if (!this.mockMessages.has(chatId)) {
      this.mockMessages.set(chatId, []);
    }
    this.mockMessages.get(chatId).push(newMessage);

    // Update last message in chat
    const chat = this.mockChats.find(c => c.id === chatId);
    if (chat) {
      chat.lastMessage = {
        text: text,
        timestamp: Date.now()
      };
      chat.unreadCount = (chat.unreadCount || 0) + 1;
    }

    // Emit new message event
    io.to(sessionId).emit('message', newMessage);
  }
}

const whatsappManager = new MockWhatsAppManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.post('/whatsapp/connect', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }

  const result = await whatsappManager.createClient(sessionId);
  res.json(result);
});

app.post('/whatsapp/disconnect', async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }

  const result = await whatsappManager.disconnectClient(sessionId);
  res.json(result);
});

app.get('/whatsapp/chats', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }

  const result = await whatsappManager.getChats(sessionId);
  res.json(result);
});

app.get('/whatsapp/messages', async (req, res) => {
  const { sessionId, chatId, limit } = req.query;
  
  if (!sessionId || !chatId) {
    return res.status(400).json({ success: false, error: 'Session ID and Chat ID required' });
  }

  const result = await whatsappManager.getMessages(sessionId, chatId, parseInt(limit) || 50);
  res.json(result);
});

app.post('/whatsapp/send', async (req, res) => {
  const { sessionId, chatId, text } = req.body;
  
  if (!sessionId || !chatId || !text) {
    return res.status(400).json({ success: false, error: 'Session ID, Chat ID, and text required' });
  }

  const result = await whatsappManager.sendMessage(sessionId, chatId, text);
  res.json(result);
});

app.get('/whatsapp/status', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }

  const isReady = whatsappManager.isReady(sessionId);
  res.json({ success: true, isReady });
});

// Development endpoint to simulate incoming messages
app.post('/whatsapp/simulate-message', async (req, res) => {
  const { sessionId, chatId, text } = req.body;
  
  if (!sessionId || !chatId || !text) {
    return res.status(400).json({ success: false, error: 'Session ID, Chat ID, and text required' });
  }

  whatsappManager.simulateIncomingMessage(sessionId, chatId, text);
  res.json({ success: true, message: 'Incoming message simulated' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeSessions: whatsappManager.clients.size,
    timestamp: new Date().toISOString(),
    mode: 'mock'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🤖 Mock WhatsApp service running on port ${PORT}`);
  console.log(`📱 Development mode - simulating WhatsApp functionality`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
}); 
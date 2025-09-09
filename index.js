require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const wppconnect = require('@wppconnect-team/wppconnect');

// Importando rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');
const chatRoutes = require('./routes/chat');

// Configuração do Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do servidor HTTP e Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração das rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);

// Inicialização do WPPConnect
const startWppConnect = async () => {
  try {
    const client = await wppconnect.create({
      session: 'wpp-multi-atendimento',
      autoClose: false,
      puppeteerOptions: {
        args: ['--no-sandbox']
      }
    });

    console.log('WPPConnect iniciado com sucesso!');

    // Evento para novas mensagens
    client.onMessage(async (message) => {
      try {
        console.log('Nova mensagem recebida:', message);
        
        // Ignorar mensagens de status ou que não são de chat
        if (message.isStatus || !message.isGroupMsg === false) {
          return;
        }
        
        // Buscar ou criar chat para o contato
        const Chat = mongoose.model('Chat');
        const Message = mongoose.model('Message');
        
        let chat = await Chat.findOne({ 'contact.number': message.from });
        
        if (!chat) {
          // Criar novo chat
          chat = new Chat({
            contact: {
              name: message.sender.pushname || message.sender.name || 'Desconhecido',
              number: message.from,
              profilePic: ''
            },
            status: 'open',
            category: 'inbox',
            lastMessageTime: new Date(),
            lastMessage: message.body,
            unreadCount: 1
          });
          
          await chat.save();
          console.log('Novo chat criado:', chat._id);
        } else {
          // Atualizar chat existente
          chat.lastMessage = message.body;
          chat.lastMessageTime = new Date();
          chat.unreadCount += 1;
          await chat.save();
        }
        
        // Criar nova mensagem
        const newMessage = new Message({
          chatId: chat._id,
          sender: 'contact',
          content: message.body || message.type || "[Mensagem sem conteúdo]", // Garantir que content sempre tenha um valor
          timestamp: new Date(),
          isRead: false
        });
        
        console.log('Dados da mensagem a ser salva:', {
          chatId: chat._id,
          sender: 'contact',
          content: message.body || message.type || "[Mensagem sem conteúdo]",
          hasContent: !!message.body,
          messageType: typeof message.body
        });
        
        if (message.hasMedia && message.mediaData) {
          newMessage.mediaUrl = message.mediaData.mediaUrl || '';
          newMessage.mediaType = message.mediaData.mimetype || '';
        }
        
        await newMessage.save();
        
        // Emitir evento para o Socket.io
        io.emit('new-message', {
          chatId: chat._id,
          message: newMessage
        });
        
        // Emitir evento para a sala específica do chat
        io.to(chat._id.toString()).emit('receive-message', newMessage);
        
        console.log('Mensagem salva com sucesso:', newMessage._id);
      } catch (error) {
        console.error('Erro ao processar mensagem recebida:', error);
      }
    });

    // Disponibilizar o cliente WPPConnect para uso em outras partes da aplicação
    app.set('wppClient', client);

  } catch (error) {
    console.error('Erro ao iniciar o WPPConnect:', error);
  }
};

// Configuração do Socket.io
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Evento para quando um usuário se conecta a uma sala de chat
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`Usuário ${socket.id} entrou na sala ${chatId}`);
  });

  // Evento para enviar mensagem
  socket.on('send-message', async (data) => {
    try {
      console.log('Mensagem recebida via socket:', data);
      const { chatId, message, userId } = data;
      
      if (!chatId) {
        console.error('Erro: chatId não fornecido');
        return;
      }
      
      // Verificar se o conteúdo da mensagem está definido
      let messageContent;
      
      // Verificar se message é uma string ou um objeto
      if (typeof message === 'string') {
        messageContent = message || "[Mensagem sem conteúdo]";
      } else if (typeof message === 'object' && message !== null) {
        messageContent = message.content || "[Mensagem sem conteúdo]";
      } else {
        messageContent = "[Mensagem sem conteúdo]";
      }
      
      console.log('Conteúdo da mensagem processado:', messageContent);
      
      // Criar nova mensagem
      const Message = mongoose.model('Message');
      const newMessage = new Message({
        chatId,
        content: messageContent,
        sender: 'user',
        userId,
        timestamp: new Date(),
        isRead: true
      });
      
      console.log('Salvando mensagem:', {
        chatId,
        sender: 'user',
        userId,
        content: messageContent,
        hasContent: !!messageContent,
        messageType: typeof message
      });
      
      try {
        // Salvar mensagem no banco de dados
        const savedMessage = await newMessage.save();
        console.log('Mensagem salva com sucesso:', savedMessage._id);
        
        // Emitir mensagem salva para a sala do chat
        io.to(chatId).emit('receive-message', savedMessage);
        
        // Atualizar último timestamp e mensagem do chat
        const Chat = mongoose.model('Chat');
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: messageContent,
          lastMessageTime: new Date()
        });
        
        console.log('Chat atualizado com sucesso');
      } catch (dbError) {
        console.error('Erro ao salvar mensagem no banco de dados:', dbError);
        console.error('Detalhes do erro:', dbError.message, dbError.stack);
        socket.emit('message-error', { error: 'Erro ao salvar mensagem: ' + dbError.message });
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      console.error('Detalhes do erro:', error.message, error.stack);
      socket.emit('message-error', { error: 'Erro ao processar mensagem: ' + error.message });
    }
  });

  // Evento para quando um usuário se desconecta
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar o WPPConnect
startWppConnect();

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
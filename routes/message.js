const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Obter mensagens de um chat
router.get('/chat/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ timestamp: 1 })
      .populate('userId', 'name avatar');
    
    res.json(messages);
  } catch (error) {
    console.error('Erro ao obter mensagens:', error);
    res.status(500).json({ message: 'Erro ao obter mensagens' });
  }
});

// Enviar mensagem
router.post('/', async (req, res) => {
  try {
    const { chatId, content, mediaUrl, mediaType } = req.body;

    // Verificar se o chat existe
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    // Garantir que o conteúdo nunca seja undefined ou vazio
    const messageContent = content || "[Mensagem sem conteúdo]";
    
    console.log('Criando nova mensagem:', {
      chatId,
      sender: 'user',
      userId: req.userId,
      content: messageContent,
      hasContent: !!messageContent,
      contentType: typeof messageContent
    });

    // Criar nova mensagem
    const message = new Message({
      chatId,
      sender: 'user',
      userId: req.userId,
      content: messageContent,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || ''
    });

    await message.save();

    // Atualizar informações do chat
    chat.lastMessage = content;
    chat.lastMessageTime = Date.now();
    
    // Se o chat não estiver atribuído a ninguém, atribuir ao usuário atual
    if (!chat.assignedTo) {
      chat.assignedTo = req.userId;
      chat.status = 'open';
      chat.category = 'mine';
    }

    await chat.save();

    // Obter informações do usuário para retornar junto com a mensagem
    const populatedMessage = await Message.findById(message._id)
      .populate('userId', 'name avatar');

    res.status(201).json(populatedMessage);

    // Enviar mensagem via WPPConnect
    const wppClient = req.app.get('wppClient');
    if (wppClient) {
      try {
        await wppClient.sendText(chat.contact.number, content);
      } catch (wppError) {
        console.error('Erro ao enviar mensagem via WPPConnect:', wppError);
      }
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

// Adicionar comentário a uma mensagem
router.post('/:id/comment', async (req, res) => {
  try {
    const { content } = req.body;

    // Verificar se a mensagem existe
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Mensagem não encontrada' });
    }

    // Adicionar comentário
    message.comments.push({
      userId: req.userId,
      content
    });

    await message.save();

    // Obter mensagem atualizada com comentários populados
    const updatedMessage = await Message.findById(req.params.id)
      .populate('userId', 'name avatar')
      .populate('comments.userId', 'name avatar');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ message: 'Erro ao adicionar comentário' });
  }
});

// Marcar mensagem como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Mensagem não encontrada' });
    }

    // Atualizar contagem de mensagens não lidas no chat
    const unreadCount = await Message.countDocuments({
      chatId: message.chatId,
      isRead: false,
      sender: 'contact'
    });

    await Chat.findByIdAndUpdate(message.chatId, { unreadCount });

    res.json(message);
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ message: 'Erro ao marcar mensagem como lida' });
  }
});

module.exports = router;
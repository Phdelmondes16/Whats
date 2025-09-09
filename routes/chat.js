const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Obter todos os chats
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = {};

    // Filtrar por categoria
    if (category) {
      query.category = category;
    }

    // Filtrar por status
    if (status) {
      query.status = status;
    }

    // Se a categoria for 'mine', filtrar por chats atribuídos ao usuário atual
    if (category === 'mine') {
      query.assignedTo = req.userId;
    }

    const chats = await Chat.find(query)
      .sort({ lastMessageTime: -1 })
      .populate('assignedTo', 'name avatar status');
    
    res.json(chats);
  } catch (error) {
    console.error('Erro ao obter chats:', error);
    res.status(500).json({ message: 'Erro ao obter chats' });
  }
});

// Obter chat por ID
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('assignedTo', 'name avatar status');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Erro ao obter chat:', error);
    res.status(500).json({ message: 'Erro ao obter chat' });
  }
});

// Criar novo chat
router.post('/', async (req, res) => {
  try {
    const { contact, assignedTo, status, category } = req.body;

    // Verificar se já existe um chat com este número
    let existingChat = await Chat.findOne({ 'contact.number': contact.number });
    
    if (existingChat) {
      return res.json(existingChat);
    }

    // Criar novo chat
    const chat = new Chat({
      contact,
      assignedTo: assignedTo || null,
      status: status || 'unassigned',
      category: category || 'unassigned'
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    res.status(500).json({ message: 'Erro ao criar chat' });
  }
});

// Atualizar chat
router.put('/:id', async (req, res) => {
  try {
    const { assignedTo, status, category, isImportant } = req.body;

    // Verificar se o chat existe
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }

    // Atualizar campos
    if (assignedTo !== undefined) {
      chat.assignedTo = assignedTo;
      
      // Se estiver atribuindo a alguém, atualizar status e categoria
      if (assignedTo) {
        chat.status = 'open';
        chat.category = 'mine';
      } else {
        chat.status = 'unassigned';
        chat.category = 'unassigned';
      }
    }

    if (status) chat.status = status;
    if (category) chat.category = category;
    if (isImportant !== undefined) chat.isImportant = isImportant;

    await chat.save();

    // Obter chat atualizado com informações do usuário atribuído
    const updatedChat = await Chat.findById(req.params.id)
      .populate('assignedTo', 'name avatar status');

    res.json(updatedChat);
  } catch (error) {
    console.error('Erro ao atualizar chat:', error);
    res.status(500).json({ message: 'Erro ao atualizar chat' });
  }
});

// Atribuir chat a um usuário
router.patch('/:id/assign', async (req, res) => {
  try {
    const { userId } = req.body;

    // Verificar se o usuário existe
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
    }

    // Atualizar chat
    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: userId || null,
        status: userId ? 'open' : 'unassigned',
        category: userId ? 'mine' : 'unassigned'
      },
      { new: true }
    ).populate('assignedTo', 'name avatar status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Erro ao atribuir chat:', error);
    res.status(500).json({ message: 'Erro ao atribuir chat' });
  }
});

// Atualizar status do chat
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Verificar se o status é válido
    if (!['open', 'closed', 'paused', 'snoozed', 'unassigned'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    // Atualizar status
    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignedTo', 'name avatar status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Erro ao atualizar status do chat:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do chat' });
  }
});

// Marcar chat como importante
router.patch('/:id/important', async (req, res) => {
  try {
    const { isImportant } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      { isImportant },
      { new: true }
    ).populate('assignedTo', 'name avatar status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat não encontrado' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Erro ao marcar chat como importante:', error);
    res.status(500).json({ message: 'Erro ao marcar chat como importante' });
  }
});

module.exports = router;
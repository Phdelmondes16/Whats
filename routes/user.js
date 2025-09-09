const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Obter todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    res.status(500).json({ message: 'Erro ao obter usuários' });
  }
});

// Obter usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro ao obter usuário' });
  }
});

// Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const { name, email, avatar, status, role } = req.body;

    // Verificar se o usuário existe
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar permissão (apenas admin pode alterar role)
    const currentUser = await User.findById(req.userId);
    if (role && currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Permissão negada para alterar função' });
    }

    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (status) user.status = status;
    if (role && currentUser.role === 'admin') user.role = role;

    await user.save();

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Atualizar status do usuário
router.patch('/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Verificar se o status é válido
    if (!['available', 'busy', 'away'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    // Atualizar status
    const user = await User.findByIdAndUpdate(
      req.userId,
      { status },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro ao atualizar status' });
  }
});

// Excluir usuário (apenas admin)
router.delete('/:id', async (req, res) => {
  try {
    // Verificar permissão
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    // Verificar se o usuário existe
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
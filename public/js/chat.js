/**
 * Serviço de Chat
 */
const ChatService = {
  chats: [],
  currentChat: null,
  currentCategory: 'inbox',
  currentFilter: null,
  socket: null,

  /**
   * Inicializa o serviço de chat
   */
  init() {
    // Inicializar Socket.io
    this.initSocket();
    
    // Carregar chats iniciais
    this.loadChats();

    // Configurar eventos de navegação
    this.setupNavEvents();

    // Configurar eventos de chat
    this.setupChatEvents();
  },

  /**
   * Inicializa a conexão com Socket.io
   */
  initSocket() {
    this.socket = io();

    // Evento para novas mensagens
    this.socket.on('new-message', (data) => {
      console.log('Nova mensagem recebida via socket:', data);
      this.handleNewMessage(data);
    });

    // Evento para receber mensagens
    this.socket.on('receive-message', (message) => {
      console.log('Mensagem recebida para chat atual:', message);
      
      // Verificar se a mensagem tem a estrutura correta
      if (!message || (!message.content && !message.chatId)) {
        console.error('Mensagem recebida com formato inválido:', message);
        return;
      }
      
      // Verificar se estamos no chat correto
      if (this.currentChat && message.chatId === this.currentChat._id) {
        // Se a mensagem for apenas uma string, criar um objeto de mensagem
        if (typeof message === 'string') {
          message = {
            content: message,
            chatId: this.currentChat._id,
            sender: 'contact',
            timestamp: new Date()
          };
        }
        
        this.addMessageToUI(message);
      }
    });
  },

  /**
   * Configura eventos de navegação
   */
  setupNavEvents() {
    // Eventos para itens de navegação
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = item.dataset.category;
        this.changeCategory(category);
      });
    });

    // Eventos para filtros
    const filterOptions = document.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
      option.addEventListener('click', () => {
        const status = option.dataset.status;
        this.applyFilter(status);
      });
    });

    // Evento para busca
    const searchInput = document.getElementById('search-chat');
    searchInput.addEventListener('input', (e) => {
      this.searchChats(e.target.value);
    });
  },

  /**
   * Configura eventos relacionados ao chat
   */
  setupChatEvents() {
    // Evento para enviar mensagem
    const sendButton = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');

    sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Evento para fechar chat
    const closeChat = document.getElementById('close-chat');
    closeChat.addEventListener('click', () => {
      this.closeCurrentChat();
    });

    // Evento para marcar como importante
    const importantChat = document.getElementById('important-chat');
    importantChat.addEventListener('click', () => {
      if (this.currentChat) {
        this.toggleImportant(this.currentChat._id, !this.currentChat.isImportant);
      }
    });

    // Evento para alterar status do chat
    const changeStatus = document.getElementById('change-status');
    const statusDropdown = document.getElementById('chat-status-dropdown');
    
    changeStatus.addEventListener('click', () => {
      statusDropdown.classList.toggle('active');
    });

    const statusOptions = document.querySelectorAll('#chat-status-dropdown .status-option');
    statusOptions.forEach(option => {
      option.addEventListener('click', () => {
        const status = option.dataset.status;
        if (this.currentChat) {
          this.updateChatStatus(this.currentChat._id, status);
        }
        statusDropdown.classList.remove('active');
      });
    });

    // Evento para atribuir chat
    const assignChat = document.getElementById('assign-chat');
    const assignModal = document.getElementById('assign-modal');
    const closeModals = document.querySelectorAll('.close-modal');
    const confirmAssign = document.getElementById('confirm-assign');

    assignChat.addEventListener('click', () => {
      this.openAssignModal();
    });

    closeModals.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });

    confirmAssign.addEventListener('click', () => {
      const selectedUser = document.querySelector('#assign-user-list .user-list-item.selected');
      if (selectedUser && this.currentChat) {
        const userId = selectedUser.dataset.userId;
        this.assignChat(this.currentChat._id, userId);
        assignModal.classList.remove('active');
      }
    });

    // Evento para respostas rápidas
    const quickRepliesBtn = document.getElementById('quick-replies');
    const quickRepliesModal = document.getElementById('quick-replies-modal');

    quickRepliesBtn.addEventListener('click', () => {
      quickRepliesModal.classList.add('active');
    });

    const quickReplyItems = document.querySelectorAll('.quick-reply-item');
    quickReplyItems.forEach(item => {
      item.addEventListener('click', () => {
        const replyText = item.querySelector('p').textContent;
        document.getElementById('message-input').value = replyText;
        quickRepliesModal.classList.remove('active');
      });
    });

    // Evento para anexar arquivo
    const attachFileBtn = document.getElementById('attach-file');
    attachFileBtn.addEventListener('click', () => {
      // Implementar funcionalidade de anexo
      alert('Funcionalidade de anexo será implementada em breve!');
    });
  },

  /**
   * Carrega os chats com base na categoria e filtro atuais
   */
  async loadChats() {
    try {
      const filters = {};
      
      if (this.currentCategory) {
        filters.category = this.currentCategory;
      }
      
      if (this.currentFilter) {
        filters.status = this.currentFilter;
      }
      
      const chats = await API.chats.getAll(filters);
      this.chats = chats;
      this.renderChatList();
      this.updateUnreadCounts();
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  },

  /**
   * Renderiza a lista de chats na interface
   */
  renderChatList() {
    const chatListElement = document.getElementById('chat-list');
    chatListElement.innerHTML = '';

    if (this.chats.length === 0) {
      chatListElement.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <p>Nenhuma conversa encontrada</p>
        </div>
      `;
      return;
    }

    this.chats.forEach(chat => {
      const chatElement = document.createElement('div');
      chatElement.className = 'chat-item';
      chatElement.dataset.id = chat._id; // Adicionar ID do chat como atributo de dados
      
      if (this.currentChat && this.currentChat._id === chat._id) {
        chatElement.classList.add('active');
      }

      const formattedTime = this.formatTime(chat.lastMessageTime);
      const assignedName = chat.assignedTo ? chat.assignedTo.name : 'Não atribuído';

      chatElement.innerHTML = `
        <img src="${chat.contact.profilePic || 'img/avatar-placeholder.svg'}" alt="${chat.contact.name}" class="chat-item-avatar">
        <div class="chat-item-content">
          <div class="chat-item-header">
            <span class="chat-item-name">${chat.contact.name}</span>
            <span class="chat-item-time">${formattedTime}</span>
          </div>
          <div class="chat-item-message">${chat.lastMessage || 'Nenhuma mensagem'}</div>
          <div class="chat-item-footer">
            <span class="chat-status ${chat.status}">${this.getStatusText(chat.status)}</span>
            ${chat.unreadCount > 0 ? `<span class="chat-unread">${chat.unreadCount}</span>` : ''}
          </div>
        </div>
      `;

      chatElement.addEventListener('click', () => {
        this.openChat(chat._id);
      });

      chatListElement.appendChild(chatElement);
    });
  },

  /**
   * Atualiza contadores de mensagens não lidas
   */
  updateUnreadCounts() {
    const categories = ['inbox', 'mine', 'unassigned', 'team'];
    
    categories.forEach(category => {
      const count = this.chats.filter(chat => 
        chat.category === category && chat.unreadCount > 0
      ).reduce((total, chat) => total + chat.unreadCount, 0);
      
      const badge = document.querySelector(`.nav-item[data-category="${category}"] .badge`);
      if (badge) {
        badge.textContent = count;
        if (count > 0) {
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    });
  },

  /**
   * Muda a categoria atual e carrega os chats correspondentes
   * @param {string} category - Nova categoria
   */
  changeCategory(category) {
    this.currentCategory = category;
    
    // Atualizar UI
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.category === category) {
        item.classList.add('active');
      }
    });

    const categoryTitle = document.getElementById('current-category-title');
    categoryTitle.textContent = this.getCategoryText(category);
    
    // Recarregar chats
    this.loadChats();
  },

  /**
   * Aplica um filtro de status aos chats
   * @param {string} status - Status para filtrar
   */
  applyFilter(status) {
    this.currentFilter = status;
    
    // Atualizar UI
    const filterOptions = document.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
      if (option.dataset.status === status) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    // Recarregar chats
    this.loadChats();
  },

  /**
   * Busca chats pelo nome do contato ou conteúdo da mensagem
   * @param {string} query - Termo de busca
   */
  searchChats(query) {
    if (!query) {
      this.loadChats();
      return;
    }

    const filteredChats = this.chats.filter(chat => {
      const nameMatch = chat.contact.name.toLowerCase().includes(query.toLowerCase());
      const messageMatch = chat.lastMessage && chat.lastMessage.toLowerCase().includes(query.toLowerCase());
      return nameMatch || messageMatch;
    });

    this.chats = filteredChats;
    this.renderChatList();
  },

  /**
   * Abre um chat específico
   * @param {string} chatId - ID do chat
   */
  async openChat(chatId) {
    try {
      const chat = await API.chats.getById(chatId);
      this.currentChat = chat;
      
      // Atualizar UI
      document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
      });
      
      const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
      if (chatItem) {
        chatItem.classList.add('active');
      }
      
      // Mostrar área de chat
      document.getElementById('chat-area').querySelector('.empty-chat').classList.add('hidden');
      document.getElementById('active-chat').classList.remove('hidden');
      
      // Preencher informações do chat
      document.getElementById('contact-name').textContent = chat.contact.name;
      document.getElementById('contact-avatar').src = chat.contact.profilePic || 'img/avatar-placeholder.svg';
      
      const chatStatus = document.getElementById('chat-status');
      chatStatus.textContent = this.getStatusText(chat.status);
      chatStatus.className = 'chat-status ' + chat.status;
      
      // Atualizar botão de importante
      const importantBtn = document.getElementById('important-chat');
      if (chat.isImportant) {
        importantBtn.innerHTML = '<i class="fas fa-star"></i>';
      } else {
        importantBtn.innerHTML = '<i class="far fa-star"></i>';
      }
      
      // Carregar mensagens
      await this.loadMessages(chatId);
      
      // Entrar na sala de chat via Socket.io
      this.socket.emit('join-chat', chatId);
    } catch (error) {
      console.error('Erro ao abrir chat:', error);
    }
  },

  /**
   * Carrega as mensagens de um chat
   * @param {string} chatId - ID do chat
   */
  async loadMessages(chatId) {
    try {
      console.log('Carregando mensagens para o chat:', chatId);
      const messages = await API.messages.getByChatId(chatId);
      console.log('Mensagens recebidas:', messages);
      
      const messagesContainer = document.getElementById('messages-container');
      if (!messagesContainer) {
        console.error('Container de mensagens não encontrado');
        return;
      }
      
      messagesContainer.innerHTML = '';
      
      if (!messages || messages.length === 0) {
        console.log('Nenhuma mensagem encontrada para este chat');
        messagesContainer.innerHTML = '<div class="empty-messages">Nenhuma mensagem encontrada</div>';
        return;
      }
      
      messages.forEach(message => {
        console.log('Adicionando mensagem à UI:', message);
        this.addMessageToUI(message);
      });
      
      // Rolar para o final
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  },

  /**
   * Adiciona uma mensagem à interface
   * @param {Object} message - Dados da mensagem
   */
  addMessageToUI(message) {
    console.log('Adicionando mensagem à UI:', message);
    
    // Verificar se a mensagem tem dados válidos
    if (!message || (!message.content && !message.chatId)) {
      console.error('Tentativa de adicionar mensagem inválida à UI:', message);
      return;
    }
    
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) {
      console.error('Container de mensagens não encontrado');
      return;
    }
    
    const messageElement = document.createElement('div');
    
    const isOutgoing = message.sender === 'user';
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    // Garantir que timestamp seja válido
    const time = this.formatTime(message.timestamp || new Date());
    
    // Garantir que o conteúdo da mensagem nunca seja undefined
    const messageContent = message.content || "[Mensagem sem conteúdo]";
    
    messageElement.innerHTML = `
      <div class="message-content">${messageContent}</div>
      <div class="message-time">${time}</div>
      ${isOutgoing ? `
        <div class="message-actions-menu">
          <button class="message-action" data-action="comment" data-id="${message._id || ''}">
            <i class="fas fa-comment"></i>
          </button>
        </div>
      ` : ''}
      ${message.comments && message.comments.length > 0 ? `
        <div class="comments">
          ${message.comments.map(comment => {
            if (!comment || !comment.content) return '';
            return `
              <div class="comment">
                <div class="comment-header">
                  <span class="comment-user">${comment.userId && typeof comment.userId === 'object' ? comment.userId.name : 'Sistema'}</span>
                  <span class="comment-time">${this.formatTime(comment.timestamp || new Date())}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;
    
    // Adicionar evento para comentário
    const commentBtn = messageElement.querySelector('.message-action[data-action="comment"]');
    if (commentBtn) {
      commentBtn.addEventListener('click', () => {
        if (message._id) {
          this.openCommentModal(message._id);
        } else {
          console.error('Não é possível adicionar comentário: ID da mensagem não disponível');
        }
      });
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Marcar como lida se for mensagem recebida e tiver ID
    if (!isOutgoing && !message.isRead && message._id) {
      this.markMessageAsRead(message._id);
    }
    
    console.log('Mensagem adicionada com sucesso à UI');
  },
  
  /**
   * Processa uma nova mensagem recebida
   * @param {Object} data - Dados da mensagem recebida
   */
  async handleNewMessage(data) {
    try {
      console.log('Processando nova mensagem:', data);
      
      if (!data || !data.chatId || !data.message) {
        console.error('Dados de mensagem inválidos:', data);
        return;
      }
      
      const { chatId, message } = data;
      
      // Verificar se o chat já existe na lista
      let chatExists = false;
      for (let i = 0; i < this.chats.length; i++) {
        if (this.chats[i]._id === chatId) {
          // Atualizar informações do chat
          this.chats[i].lastMessage = message.content;
          this.chats[i].lastMessageTime = message.timestamp;
          this.chats[i].unreadCount += 1;
          chatExists = true;
          break;
        }
      }
      
      // Se o chat não existir na lista, buscar do servidor
      if (!chatExists) {
        try {
          const chat = await API.chats.getById(chatId);
          if (chat) {
            this.chats.unshift(chat); // Adicionar no início da lista
          }
        } catch (error) {
          console.error('Erro ao buscar chat:', error);
        }
      }
      
      // Reordenar chats por data da última mensagem
      this.chats.sort((a, b) => {
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });
      
      // Atualizar UI
      this.renderChatList();
      this.updateUnreadCounts();
      
      // Se o chat atual for o mesmo da mensagem, adicionar à UI
      if (this.currentChat && this.currentChat._id === chatId) {
        this.addMessageToUI(message);
      } else {
        // Mostrar notificação
        const chatName = this.chats.find(c => c._id === chatId)?.contact?.name || 'Contato';
        UIService.showNotification(`Nova mensagem de ${chatName}: ${message.content}`, 'info');
      }
    } catch (error) {
      console.error('Erro ao processar nova mensagem:', error);
    }
  },

  /**
   * Envia uma mensagem para o chat atual
   */
  async sendMessage() {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content || !this.currentChat) return;
    
    try {
      // Criar objeto de mensagem temporário para UI
      const tempMessage = {
        _id: 'temp_' + Date.now(),
        chatId: this.currentChat._id,
        content: content,
        sender: 'user',
        timestamp: new Date(),
        isRead: true
      };
      
      // Adicionar mensagem temporária à UI imediatamente
      this.addMessageToUI(tempMessage);
      
      const messageData = {
        chatId: this.currentChat._id,
        content
      };
      
      const sentMessage = await API.messages.send(messageData);
      
      // Limpar input
      messageInput.value = '';
      
      // Emitir evento para Socket.io
      console.log('Enviando mensagem via socket:', {
        chatId: this.currentChat._id,
        message: sentMessage,
        userId: AuthService.currentUser._id
      });
      
      this.socket.emit('send-message', {
        chatId: this.currentChat._id,
        message: sentMessage.content, // Enviar apenas o conteúdo da mensagem
        userId: AuthService.currentUser._id
      });
      
      // Atualizar informações do chat na lista
      this.currentChat.lastMessage = content;
      this.currentChat.lastMessageTime = new Date();
      this.renderChatList();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  },

  /**
   * Marca uma mensagem como lida
   * @param {string} messageId - ID da mensagem
   */
  async markMessageAsRead(messageId) {
    try {
      await API.messages.markAsRead(messageId);
      
      // Atualizar contagem de não lidas
      if (this.currentChat) {
        this.currentChat.unreadCount = Math.max(0, this.currentChat.unreadCount - 1);
        this.updateUnreadCounts();
      }
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  },

  /**
   * Abre o modal para adicionar comentário
   * @param {string} messageId - ID da mensagem
   */
  openCommentModal(messageId) {
    const commentModal = document.getElementById('comment-modal');
    const saveCommentBtn = document.getElementById('save-comment');
    const commentInput = document.getElementById('comment-input');
    
    commentModal.classList.add('active');
    commentInput.value = '';
    
    // Remover evento anterior se existir
    saveCommentBtn.removeEventListener('click', saveCommentBtn.saveHandler);
    
    // Adicionar novo evento
    saveCommentBtn.saveHandler = async () => {
      const content = commentInput.value.trim();
      if (content) {
        try {
          await this.addComment(messageId, content);
          commentModal.classList.remove('active');
        } catch (error) {
          console.error('Erro ao adicionar comentário:', error);
        }
      }
    };
    
    saveCommentBtn.addEventListener('click', saveCommentBtn.saveHandler);
  },

  /**
   * Adiciona um comentário a uma mensagem
   * @param {string} messageId - ID da mensagem
   * @param {string} content - Conteúdo do comentário
   */
  async addComment(messageId, content) {
    try {
      const updatedMessage = await API.messages.addComment(messageId, content);
      
      // Atualizar UI
      const messagesContainer = document.getElementById('messages-container');
      const messageElements = messagesContainer.querySelectorAll('.message');
      
      messageElements.forEach(element => {
        const actionBtn = element.querySelector(`.message-action[data-id="${messageId}"]`);
        if (actionBtn) {
          // Encontrou a mensagem, atualizar comentários
          const commentsContainer = element.querySelector('.comments') || document.createElement('div');
          commentsContainer.className = 'comments';
          
          // Limpar comentários existentes
          commentsContainer.innerHTML = '';
          
          // Adicionar todos os comentários
          updatedMessage.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
              <div class="comment-header">
                <span class="comment-user">${comment.userId.name}</span>
                <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
              </div>
              <div class="comment-content">${comment.content}</div>
            `;
            commentsContainer.appendChild(commentElement);
          });
          
          // Adicionar container de comentários se não existir
          if (!element.querySelector('.comments')) {
            element.appendChild(commentsContainer);
          }
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      throw error;
    }
  },

  /**
   * Fecha o chat atual
   */
  closeCurrentChat() {
    this.currentChat = null;
    document.getElementById('chat-area').querySelector('.empty-chat').classList.remove('hidden');
    document.getElementById('active-chat').classList.add('hidden');
    
    // Remover seleção na lista
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
    });
  },

  /**
   * Marca um chat como importante ou não
   * @param {string} chatId - ID do chat
   * @param {boolean} isImportant - Se é importante
   */
  async toggleImportant(chatId, isImportant) {
    try {
      const updatedChat = await API.chats.markImportant(chatId, isImportant);
      
      // Atualizar chat atual
      if (this.currentChat && this.currentChat._id === chatId) {
        this.currentChat = updatedChat;
        
        // Atualizar botão
        const importantBtn = document.getElementById('important-chat');
        if (updatedChat.isImportant) {
          importantBtn.innerHTML = '<i class="fas fa-star"></i>';
        } else {
          importantBtn.innerHTML = '<i class="far fa-star"></i>';
        }
      }
      
      // Atualizar na lista de chats
      this.chats = this.chats.map(chat => 
        chat._id === chatId ? updatedChat : chat
      );
      
      this.renderChatList();
    } catch (error) {
      console.error('Erro ao marcar chat como importante:', error);
    }
  },

  /**
   * Atualiza o status de um chat
   * @param {string} chatId - ID do chat
   * @param {string} status - Novo status
   */
  async updateChatStatus(chatId, status) {
    try {
      const updatedChat = await API.chats.updateStatus(chatId, status);
      
      // Atualizar chat atual
      if (this.currentChat && this.currentChat._id === chatId) {
        this.currentChat = updatedChat;
        
        // Atualizar status na UI
        const chatStatus = document.getElementById('chat-status');
        chatStatus.textContent = this.getStatusText(status);
        chatStatus.className = 'chat-status ' + status;
      }
      
      // Atualizar na lista de chats
      this.chats = this.chats.map(chat => 
        chat._id === chatId ? updatedChat : chat
      );
      
      this.renderChatList();
    } catch (error) {
      console.error('Erro ao atualizar status do chat:', error);
    }
  },

  /**
   * Abre o modal para atribuir chat
   */
  async openAssignModal() {
    try {
      const users = await API.users.getAll();
      const assignModal = document.getElementById('assign-modal');
      const userListElement = document.getElementById('assign-user-list');
      
      userListElement.innerHTML = '';
      
      // Adicionar opção para desatribuir
      const unassignElement = document.createElement('div');
      unassignElement.className = 'user-list-item';
      unassignElement.dataset.userId = '';
      
      if (!this.currentChat.assignedTo) {
        unassignElement.classList.add('selected');
      }
      
      unassignElement.innerHTML = `
        <i class="fas fa-user-slash"></i>
        <div class="user-list-item-info">
          <div class="user-list-item-name">Não atribuído</div>
          <div class="user-list-item-status">Remover atribuição atual</div>
        </div>
      `;
      
      unassignElement.addEventListener('click', () => {
        document.querySelectorAll('#assign-user-list .user-list-item').forEach(item => {
          item.classList.remove('selected');
        });
        unassignElement.classList.add('selected');
      });
      
      userListElement.appendChild(unassignElement);
      
      // Adicionar usuários
      users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-list-item';
        userElement.dataset.userId = user._id;
        
        if (this.currentChat.assignedTo && this.currentChat.assignedTo._id === user._id) {
          userElement.classList.add('selected');
        }
        
        userElement.innerHTML = `
          <img src="${user.avatar || 'img/avatar-placeholder.svg'}" alt="${user.name}">
          <div class="user-list-item-info">
            <div class="user-list-item-name">${user.name}</div>
            <div class="user-list-item-status">
              <i class="fas fa-circle status-${user.status}"></i>
              ${this.getStatusText(user.status)}
            </div>
          </div>
        `;
        
        userElement.addEventListener('click', () => {
          document.querySelectorAll('#assign-user-list .user-list-item').forEach(item => {
            item.classList.remove('selected');
          });
          userElement.classList.add('selected');
        });
        
        userListElement.appendChild(userElement);
      });
      
      assignModal.classList.add('active');
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  },

  /**
   * Atribui um chat a um usuário
   * @param {string} chatId - ID do chat
   * @param {string} userId - ID do usuário (vazio para desatribuir)
   */
  async assignChat(chatId, userId) {
    try {
      const updatedChat = await API.chats.assign(chatId, userId || null);
      
      // Atualizar chat atual
      if (this.currentChat && this.currentChat._id === chatId) {
        this.currentChat = updatedChat;
      }
      
      // Atualizar na lista de chats
      this.chats = this.chats.map(chat => 
        chat._id === chatId ? updatedChat : chat
      );
      
      // Recarregar chats se a categoria for alterada
      if (updatedChat.category !== this.currentCategory) {
        this.loadChats();
      } else {
        this.renderChatList();
      }
    } catch (error) {
      console.error('Erro ao atribuir chat:', error);
    }
  },

  /**
   * Processa uma nova mensagem recebida via WPPConnect
   * @param {Object} message - Mensagem do WPPConnect
   */
  async handleNewMessage(message) {
    try {
      // Verificar se já existe um chat para este contato
      let chat = this.chats.find(c => c.contact.number === message.from);
      
      if (!chat) {
        // Criar novo chat
        const newChat = {
          contact: {
            name: message.sender.pushname || message.from,
            number: message.from,
            profilePic: ''
          },
          status: 'unassigned',
          category: 'unassigned'
        };
        
        chat = await API.chats.create(newChat);
        this.chats.unshift(chat);
      }
      
      // Criar mensagem no banco de dados
      const messageData = {
        chatId: chat._id,
        sender: 'contact',
        content: message.body,
        mediaUrl: message.isMedia ? message.mediaUrl : ''
      };
      
      const savedMessage = await API.messages.send(messageData);
      
      // Atualizar informações do chat
      chat.lastMessage = message.body;
      chat.lastMessageTime = new Date();
      chat.unreadCount = (chat.unreadCount || 0) + 1;
      
      // Atualizar UI se o chat estiver aberto
      if (this.currentChat && this.currentChat._id === chat._id) {
        this.addMessageToUI(savedMessage);
      }
      
      // Atualizar lista de chats
      this.renderChatList();
      this.updateUnreadCounts();
    } catch (error) {
      console.error('Erro ao processar nova mensagem:', error);
    }
  },

  /**
   * Formata um timestamp para exibição
   * @param {string|Date} timestamp - Data a ser formatada
   * @returns {string} Data formatada
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Hoje
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Ontem
      return 'Ontem';
    } else if (diffDays < 7) {
      // Esta semana
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return days[date.getDay()];
    } else {
      // Mais de uma semana
      return date.toLocaleDateString();
    }
  },

  /**
   * Obtém o texto para exibição de um status
   * @param {string} status - Status do chat
   * @returns {string} Texto do status
   */
  getStatusText(status) {
    const statusMap = {
      'open': 'Em Andamento',
      'closed': 'Fechado',
      'paused': 'Pausado',
      'snoozed': 'Snoozed',
      'unassigned': 'Não Atribuído',
      'available': 'Disponível',
      'busy': 'Ocupado',
      'away': 'Ausente'
    };
    
    return statusMap[status] || status;
  },

  /**
   * Obtém o texto para exibição de uma categoria
   * @param {string} category - Categoria do chat
   * @returns {string} Texto da categoria
   */
  getCategoryText(category) {
    const categoryMap = {
      'inbox': 'Caixa de Entrada',
      'mine': 'Minhas Mensagens',
      'unassigned': 'Não Atribuídas',
      'team': 'Equipe'
    };
    
    return categoryMap[category] || category;
  }
};
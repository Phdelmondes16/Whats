/**
 * Arquivo principal para inicialização da aplicação
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar serviços
  initApp();
});

/**
 * Inicializa a aplicação
 */
async function initApp() {
  try {
    // Inicializar serviço de UI
    UIService.init();
    
    // Verificar autenticação
    const isAuthenticated = await AuthService.checkAuth();
    
    if (isAuthenticated) {
      // Inicializar Socket.io
      await SocketService.init();
      
      // Inicializar serviço de chat
      await ChatService.init();
      
      // Mostrar interface principal
      showMainInterface();
    } else {
      // Mostrar modal de login
      AuthService.showLoginModal();
    }
    
    // Configurar eventos globais
    setupGlobalEvents();
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    UIService.showNotification('Erro ao inicializar aplicação. Por favor, recarregue a página.', 'error');
  }
}

/**
 * Mostra a interface principal da aplicação
 */
function showMainInterface() {
  // Ocultar tela de carregamento se existir
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
  
  // Mostrar conteúdo principal
  document.getElementById('app-container').classList.remove('hidden');
  
  // Carregar lista de conversas inicial
  ChatService.loadChats('inbox');
  
  // Atualizar informações do usuário na interface
  AuthService.updateUserInfo();
}

/**
 * Configura eventos globais da aplicação
 */
function setupGlobalEvents() {
  // Navegação principal
  setupNavigation();
  
  // Eventos de modais
  setupModals();
  
  // Eventos de filtros
  setupFilters();
  
  // Eventos de logout
  setupLogout();
}

/**
 * Configura eventos de navegação
 */
function setupNavigation() {
  // Navegação principal (inbox, mine, unassigned, team)
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remover classe ativa de todos os itens
      navItems.forEach(i => i.classList.remove('active'));
      
      // Adicionar classe ativa ao item clicado
      item.classList.add('active');
      
      // Obter categoria
      const category = item.dataset.category;
      
      // Carregar chats da categoria
      ChatService.loadChats(category);
    });
  });
}

/**
 * Configura eventos de modais
 */
function setupModals() {
  // Fechar modais ao clicar fora ou no botão de fechar
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.modal-close');
  
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      modal.classList.remove('active');
    });
  });
  
  // Configurar modal de atribuição
  setupAssignModal();
  
  // Configurar modal de respostas rápidas
  setupQuickRepliesModal();
  
  // Configurar modal de comentários
  setupCommentsModal();
}

/**
 * Configura o modal de atribuição de chat
 */
function setupAssignModal() {
  const assignForm = document.getElementById('assign-form');
  
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const chatId = assignForm.dataset.chatId;
      const userId = document.getElementById('assign-user').value;
      
      try {
        await ChatService.assignChat(chatId, userId);
        document.getElementById('assign-modal').classList.remove('active');
        UIService.showNotification('Chat atribuído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao atribuir chat:', error);
        UIService.showNotification('Erro ao atribuir chat.', 'error');
      }
    });
  }
}

/**
 * Configura o modal de respostas rápidas
 */
function setupQuickRepliesModal() {
  const quickRepliesList = document.getElementById('quick-replies-list');
  
  if (quickRepliesList) {
    quickRepliesList.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-reply-item')) {
        const replyText = e.target.dataset.text;
        document.getElementById('message-input').value = replyText;
        document.getElementById('quick-replies-modal').classList.remove('active');
      }
    });
  }
}

/**
 * Configura o modal de comentários
 */
function setupCommentsModal() {
  const commentForm = document.getElementById('comment-form');
  
  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const messageId = commentForm.dataset.messageId;
      const commentText = document.getElementById('comment-input').value;
      
      if (!commentText.trim()) return;
      
      try {
        await ChatService.addComment(messageId, commentText);
        document.getElementById('comment-input').value = '';
        document.getElementById('comments-modal').classList.remove('active');
        UIService.showNotification('Comentário adicionado com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        UIService.showNotification('Erro ao adicionar comentário.', 'error');
      }
    });
  }
}

/**
 * Configura eventos de filtros
 */
function setupFilters() {
  const statusFilters = document.querySelectorAll('.status-filter');
  
  statusFilters.forEach(filter => {
    filter.addEventListener('click', () => {
      // Remover classe ativa de todos os filtros
      statusFilters.forEach(f => f.classList.remove('active'));
      
      // Adicionar classe ativa ao filtro clicado
      filter.classList.add('active');
      
      // Obter status
      const status = filter.dataset.status;
      
      // Obter categoria atual
      const activeCategory = document.querySelector('.nav-item.active').dataset.category;
      
      // Carregar chats com filtro
      ChatService.loadChats(activeCategory, status);
    });
  });
}

/**
 * Configura evento de logout
 */
function setupLogout() {
  const logoutButton = document.getElementById('logout-button');
  
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      AuthService.logout();
    });
  }
}
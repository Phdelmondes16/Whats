/**
 * Serviço de UI
 */
const UIService = {
  /**
   * Inicializa o serviço de UI
   */
  init() {
    this.setupStatusToggle();
    this.setupResponsiveUI();
  },

  /**
   * Configura o toggle de status do usuário
   */
  setupStatusToggle() {
    const statusToggle = document.getElementById('status-toggle');
    const statusDropdown = document.getElementById('status-dropdown');
    const statusOptions = document.querySelectorAll('#status-dropdown .status-option');

    statusToggle.addEventListener('click', () => {
      statusDropdown.classList.toggle('active');
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!statusToggle.contains(e.target) && !statusDropdown.contains(e.target)) {
        statusDropdown.classList.remove('active');
      }
    });

    // Opções de status
    statusOptions.forEach(option => {
      option.addEventListener('click', () => {
        const status = option.dataset.status;
        AuthService.updateStatus(status);
        statusDropdown.classList.remove('active');
      });
    });
  },

  /**
   * Configura a UI responsiva
   */
  setupResponsiveUI() {
    // Implementar funcionalidades responsivas se necessário
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width <= 768) {
        // Adicionar botão para mostrar/esconder lista de chats em telas pequenas
        this.setupMobileNavigation();
      }
    };

    // Executar na inicialização
    handleResize();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', handleResize);
  },

  /**
   * Configura navegação para dispositivos móveis
   */
  setupMobileNavigation() {
    // Verificar se o botão já existe
    if (document.getElementById('mobile-toggle')) return;

    // Criar botão para mostrar/esconder lista de chats
    const toggleButton = document.createElement('button');
    toggleButton.id = 'mobile-toggle';
    toggleButton.className = 'mobile-toggle';
    toggleButton.innerHTML = '<i class="fas fa-bars"></i>';

    // Adicionar ao header da lista de chats
    const chatListHeader = document.querySelector('.chat-list-header');
    chatListHeader.prepend(toggleButton);

    // Adicionar evento
    toggleButton.addEventListener('click', () => {
      const chatListSection = document.querySelector('.chat-list-section');
      chatListSection.classList.toggle('active');
    });

    // Fechar lista ao selecionar um chat
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const chatListSection = document.querySelector('.chat-list-section');
        chatListSection.classList.remove('active');
      });
    });
  },

  /**
   * Exibe uma notificação na interface
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo de notificação (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Verificar se já existe um container de notificações
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container';
      document.body.appendChild(notificationContainer);
    }

    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">${message}</div>
      <button class="notification-close">&times;</button>
    `;

    // Adicionar ao container
    notificationContainer.appendChild(notification);

    // Configurar botão de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.classList.add('notification-hiding');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });

    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  },

  /**
   * Adiciona estilos CSS dinamicamente
   */
  addStyles() {
    // Adicionar estilos para notificações se não existirem
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .notification {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 300px;
          max-width: 400px;
          animation: notification-slide-in 0.3s ease;
        }
        
        .notification-success {
          border-left: 4px solid #4CAF50;
        }
        
        .notification-error {
          border-left: 4px solid #F44336;
        }
        
        .notification-info {
          border-left: 4px solid #2196F3;
        }
        
        .notification-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
        }
        
        .notification-hiding {
          animation: notification-slide-out 0.3s ease forwards;
        }
        
        @keyframes notification-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes notification-slide-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        
        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          margin-right: 10px;
        }
        
        @media (max-width: 768px) {
          .mobile-toggle {
            display: block;
          }
        }
      `;
      
      document.head.appendChild(style);
    }
  }
};

// Adicionar estilos ao carregar
document.addEventListener('DOMContentLoaded', () => {
  UIService.addStyles();
});
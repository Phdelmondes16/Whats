/**
 * Serviço de Autenticação
 */
const AuthService = {
  currentUser: null,
  isAuthenticated: false,
  loginModal: null,

  /**
   * Inicializa o serviço de autenticação
   */
  init() {
    this.loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    // Verificar se há token salvo
    const token = localStorage.getItem('token');
    if (token) {
      this.checkAuth();
    } else {
      this.showLoginModal();
    }

    // Evento de login
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!email || !password) {
        loginError.textContent = 'Preencha todos os campos';
        return;
      }

      try {
        loginError.textContent = '';
        const result = await API.auth.login({ email, password });
        this.handleLoginSuccess(result);
      } catch (error) {
        loginError.textContent = error.message || 'Erro ao fazer login';
      }
    });

    // Permitir envio do formulário com Enter
    loginForm.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loginBtn.click();
      }
    });
  },

  /**
   * Verifica se o usuário está autenticado
   */
  async checkAuth() {
    try {
      const user = await API.auth.getCurrentUser();
      this.currentUser = user;
      this.isAuthenticated = true;
      this.hideLoginModal();
      this.updateUserInfo();
      return true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      this.logout();
      return false;
    }
  },

  /**
   * Processa o login bem-sucedido
   * @param {Object} data - Dados retornados pelo login
   */
  handleLoginSuccess(data) {
    const { token, user } = data;
    console.log('Login bem-sucedido, token recebido:', token);
    API.setToken(token);
    console.log('Token armazenado no localStorage:', localStorage.getItem('token'));
    this.currentUser = user;
    this.isAuthenticated = true;
    this.hideLoginModal();
    this.updateUserInfo();
    
    // Inicializar a aplicação após login
    ChatService.init();
    UIService.init();
  },

  /**
   * Realiza logout do usuário
   */
  logout() {
    API.clearToken();
    this.currentUser = null;
    this.isAuthenticated = false;
    this.showLoginModal();
  },

  /**
   * Exibe o modal de login
   */
  showLoginModal() {
    this.loginModal.classList.add('active');
  },

  /**
   * Esconde o modal de login
   */
  hideLoginModal() {
    this.loginModal.classList.remove('active');
  },

  /**
   * Atualiza as informações do usuário na interface
   */
  updateUserInfo() {
    if (!this.currentUser) return;

    const userNameElement = document.getElementById('user-name');
    const userRoleElement = document.getElementById('user-role');
    const userAvatarElement = document.getElementById('user-avatar');
    const userStatusElement = document.getElementById('user-status');

    userNameElement.textContent = this.currentUser.name;
    userRoleElement.textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Atendente';
    
    if (this.currentUser.avatar) {
      userAvatarElement.src = this.currentUser.avatar;
    }

    // Atualizar indicador de status
    userStatusElement.className = 'status-indicator';
    userStatusElement.classList.add(`status-${this.currentUser.status}`);

    // Atualizar botão de status
    const statusToggle = document.getElementById('status-toggle');
    statusToggle.innerHTML = `
      <i class="fas fa-circle status-${this.currentUser.status}"></i>
      <i class="fas fa-chevron-down"></i>
    `;
  },

  /**
   * Atualiza o status do usuário
   * @param {string} status - Novo status
   */
  async updateStatus(status) {
    try {
      const updatedUser = await API.users.updateStatus(status);
      this.currentUser = updatedUser;
      this.updateUserInfo();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }
};
/**
 * API Service para comunicação com o backend
 */
const API = {
  baseUrl: '/api',
  token: localStorage.getItem('token'),

  /**
   * Configura o token para requisições autenticadas
   * @param {string} token - Token JWT
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  },

  /**
   * Remove o token armazenado
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  },

  /**
   * Configura headers para requisições
   * @param {boolean} withAuth - Se deve incluir token de autenticação
   * @returns {Object} Headers da requisição
   */
  headers(withAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (withAuth && this.token) {
      headers['x-auth-token'] = this.token;
      console.log('Enviando token de autenticação:', this.token);
    } else {
      console.log('Requisição sem token de autenticação');
    }

    return headers;
  },

  /**
   * Realiza uma requisição GET
   * @param {string} endpoint - Endpoint da API
   * @param {boolean} withAuth - Se deve incluir token de autenticação
   * @returns {Promise} Promessa com resultado da requisição
   */
  async get(endpoint, withAuth = true) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.headers(withAuth)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  /**
   * Realiza uma requisição POST
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a serem enviados
   * @param {boolean} withAuth - Se deve incluir token de autenticação
   * @returns {Promise} Promessa com resultado da requisição
   */
  async post(endpoint, data, withAuth = true) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.headers(withAuth),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },

  /**
   * Realiza uma requisição PUT
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a serem enviados
   * @returns {Promise} Promessa com resultado da requisição
   */
  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  },

  /**
   * Realiza uma requisição PATCH
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a serem enviados
   * @returns {Promise} Promessa com resultado da requisição
   */
  async patch(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API PATCH Error:', error);
      throw error;
    }
  },

  /**
   * Realiza uma requisição DELETE
   * @param {string} endpoint - Endpoint da API
   * @returns {Promise} Promessa com resultado da requisição
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.headers()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro na requisição');
      }

      return await response.json();
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  },

  // Endpoints específicos

  // Autenticação
  auth: {
    /**
     * Realiza login do usuário
     * @param {Object} credentials - Credenciais do usuário
     * @returns {Promise} Promessa com dados do usuário e token
     */
    async login(credentials) {
      return API.post('/auth/login', credentials, false);
    },

    /**
     * Registra um novo usuário
     * @param {Object} userData - Dados do usuário
     * @returns {Promise} Promessa com dados do usuário e token
     */
    async register(userData) {
      return API.post('/auth/register', userData, false);
    },

    /**
     * Obtém dados do usuário atual
     * @returns {Promise} Promessa com dados do usuário
     */
    async getCurrentUser() {
      return API.get('/auth/me');
    }
  },

  // Usuários
  users: {
    /**
     * Obtém todos os usuários
     * @returns {Promise} Promessa com lista de usuários
     */
    async getAll() {
      return API.get('/users');
    },

    /**
     * Obtém um usuário específico
     * @param {string} id - ID do usuário
     * @returns {Promise} Promessa com dados do usuário
     */
    async getById(id) {
      return API.get(`/users/${id}`);
    },

    /**
     * Atualiza um usuário
     * @param {string} id - ID do usuário
     * @param {Object} userData - Dados do usuário
     * @returns {Promise} Promessa com dados atualizados
     */
    async update(id, userData) {
      return API.put(`/users/${id}`, userData);
    },

    /**
     * Atualiza o status do usuário
     * @param {string} status - Novo status
     * @returns {Promise} Promessa com dados atualizados
     */
    async updateStatus(status) {
      return API.patch('/users/status', { status });
    }
  },

  // Chats
  chats: {
    /**
     * Obtém todos os chats
     * @param {Object} filters - Filtros (categoria, status)
     * @returns {Promise} Promessa com lista de chats
     */
    async getAll(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/chats?${queryParams}` : '/chats';
      return API.get(endpoint);
    },

    /**
     * Obtém um chat específico
     * @param {string} id - ID do chat
     * @returns {Promise} Promessa com dados do chat
     */
    async getById(id) {
      return API.get(`/chats/${id}`);
    },

    /**
     * Cria um novo chat
     * @param {Object} chatData - Dados do chat
     * @returns {Promise} Promessa com dados do chat criado
     */
    async create(chatData) {
      return API.post('/chats', chatData);
    },

    /**
     * Atualiza um chat
     * @param {string} id - ID do chat
     * @param {Object} chatData - Dados do chat
     * @returns {Promise} Promessa com dados atualizados
     */
    async update(id, chatData) {
      return API.put(`/chats/${id}`, chatData);
    },

    /**
     * Atribui um chat a um usuário
     * @param {string} id - ID do chat
     * @param {string} userId - ID do usuário (null para desatribuir)
     * @returns {Promise} Promessa com dados atualizados
     */
    async assign(id, userId) {
      return API.patch(`/chats/${id}/assign`, { userId });
    },

    /**
     * Atualiza o status de um chat
     * @param {string} id - ID do chat
     * @param {string} status - Novo status
     * @returns {Promise} Promessa com dados atualizados
     */
    async updateStatus(id, status) {
      return API.patch(`/chats/${id}/status`, { status });
    },

    /**
     * Marca um chat como importante
     * @param {string} id - ID do chat
     * @param {boolean} isImportant - Se é importante
     * @returns {Promise} Promessa com dados atualizados
     */
    async markImportant(id, isImportant) {
      return API.patch(`/chats/${id}/important`, { isImportant });
    }
  },

  // Mensagens
  messages: {
    /**
     * Obtém mensagens de um chat
     * @param {string} chatId - ID do chat
     * @returns {Promise} Promessa com lista de mensagens
     */
    async getByChatId(chatId) {
      console.log('Solicitando mensagens para o chat:', chatId);
      try {
        const messages = await API.get(`/messages/chat/${chatId}`);
        console.log('Resposta da API de mensagens:', messages);
        return messages;
      } catch (error) {
        console.error('Erro ao obter mensagens do chat:', error);
        throw error;
      }
    },

    /**
     * Envia uma mensagem
     * @param {string} chatId - ID do chat
     * @param {string} content - Conteúdo da mensagem
     * @param {string} [mediaUrl] - URL da mídia (opcional)
     * @param {string} [mediaType] - Tipo da mídia (opcional)
     * @returns {Promise} Promessa com dados da mensagem enviada
     */
    async send(chatId, content, mediaUrl = '', mediaType = '') {
      console.log('API.messages.send - Enviando mensagem:', {
        chatId,
        content: content || "[Mensagem sem conteúdo]",
        mediaUrl,
        mediaType
      });
      
      // Garantir que o conteúdo nunca seja undefined ou vazio
      const messageContent = content || "[Mensagem sem conteúdo]";
      
      return API.post('/messages', {
        chatId,
        content: messageContent,
        mediaUrl,
        mediaType
      });
    },

    /**
     * Adiciona um comentário a uma mensagem
     * @param {string} id - ID da mensagem
     * @param {string} content - Conteúdo do comentário
     * @returns {Promise} Promessa com dados atualizados
     */
    async addComment(id, content) {
      return API.post(`/messages/${id}/comment`, { content });
    },

    /**
     * Marca uma mensagem como lida
     * @param {string} id - ID da mensagem
     * @returns {Promise} Promessa com dados atualizados
     */
    async markAsRead(id) {
      return API.patch(`/messages/${id}/read`, {});
    }
  }
};
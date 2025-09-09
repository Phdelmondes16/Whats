/**
 * Serviço de Socket.io para comunicação em tempo real
 */
const SocketService = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
  callbacks: {},

  /**
   * Inicializa a conexão com o Socket.io
   */
  init() {
    return new Promise((resolve, reject) => {
      try {
        // Verificar se já está conectado
        if (this.isConnected && this.socket) {
          console.log('Socket já está conectado');
          return resolve(this.socket);
        }

        // Obter token de autenticação
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Token não encontrado. Usuário não autenticado.');
          return reject(new Error('Usuário não autenticado'));
        }

        // Inicializar socket com autenticação
        this.socket = io('/', {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval
        });

        // Configurar eventos
        this.setupEvents();

        // Resolver promessa quando conectado
        this.socket.on('connect', () => {
          console.log('Socket conectado com sucesso');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(this.socket);
        });

        // Rejeitar promessa em caso de erro
        this.socket.on('connect_error', (error) => {
          console.error('Erro ao conectar socket:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.isConnected = false;
            reject(error);
          }
        });
      } catch (error) {
        console.error('Erro ao inicializar socket:', error);
        reject(error);
      }
    });
  },

  /**
   * Configura os eventos do socket
   */
  setupEvents() {
    if (!this.socket) return;

    // Evento de desconexão
    this.socket.on('disconnect', (reason) => {
      console.log(`Socket desconectado: ${reason}`);
      this.isConnected = false;

      // Tentar reconectar se a desconexão não foi intencional
      if (reason === 'io server disconnect') {
        // Desconexão do servidor, reconectar manualmente
        setTimeout(() => this.socket.connect(), this.reconnectInterval);
      }
      // Para outros motivos, a reconexão automática do socket.io será usada
    });

    // Evento de reconexão
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconectado após ${attemptNumber} tentativas`);
      this.isConnected = true;
    });

    // Evento de erro de reconexão
    this.socket.on('reconnect_error', (error) => {
      console.error('Erro ao reconectar socket:', error);
    });

    // Evento de nova mensagem
    this.socket.on('new_message', (data) => {
      console.log('Nova mensagem recebida:', data);
      this.triggerCallback('new_message', data);
    });

    // Evento de atualização de chat
    this.socket.on('chat_updated', (data) => {
      console.log('Chat atualizado:', data);
      this.triggerCallback('chat_updated', data);
    });

    // Evento de atualização de status de usuário
    this.socket.on('user_status_changed', (data) => {
      console.log('Status de usuário alterado:', data);
      this.triggerCallback('user_status_changed', data);
    });

    // Evento de nova conexão WhatsApp
    this.socket.on('whatsapp_connected', (data) => {
      console.log('WhatsApp conectado:', data);
      this.triggerCallback('whatsapp_connected', data);
    });

    // Evento de desconexão WhatsApp
    this.socket.on('whatsapp_disconnected', (data) => {
      console.log('WhatsApp desconectado:', data);
      this.triggerCallback('whatsapp_disconnected', data);
    });
  },

  /**
   * Registra um callback para um evento específico
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função de callback
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  },

  /**
   * Configura o evento para receber novas mensagens
   * @param {Function} callback - Função a ser chamada quando uma nova mensagem for recebida
   */
  onNewMessage(callback) {
    this.socket.on('receive-message', (message) => {
      console.log('Nova mensagem recebida via socket:', message);
      
      // Verificar se a mensagem tem dados válidos
      if (!message) {
        console.error('Mensagem recebida inválida');
        return;
      }
      
      // Se a mensagem for uma string, convertê-la para objeto
      if (typeof message === 'string') {
        try {
          message = { content: message };
        } catch (e) {
          console.error('Erro ao processar mensagem string:', e);
        }
      }
      
      // Garantir que a mensagem tenha um conteúdo
      if (!message.content) {
        message.content = "[Mensagem sem conteúdo]";
      }
      
      // Garantir que a mensagem tenha um timestamp
      if (!message.timestamp) {
        message.timestamp = new Date();
      }
      
      if (callback && typeof callback === 'function') {
        callback(message);
      }
    });
    
    // Adicionar listener para erros de mensagem
    this.socket.on('message-error', (error) => {
      console.error('Erro na mensagem:', error);
    });
  },

  /**
   * Remove um callback para um evento específico
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função de callback a ser removida
   */
  off(event, callback) {
    if (!this.callbacks[event]) return;
    
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
  },

  /**
   * Dispara todos os callbacks registrados para um evento
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  triggerCallback(event, data) {
    if (!this.callbacks[event]) return;
    
    this.callbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro ao executar callback para evento ${event}:`, error);
      }
    });
  },

  /**
   * Emite um evento para o servidor
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   * @returns {Promise} - Promessa resolvida quando o evento for emitido
   */
  emit(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        return this.init()
          .then(() => {
            this.socket.emit(event, data, (response) => {
              resolve(response);
            });
          })
          .catch(reject);
      }

      this.socket.emit(event, data, (response) => {
        resolve(response);
      });
    });
  },

  /**
   * Desconecta o socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.socket = null;
      console.log('Socket desconectado manualmente');
    }
  }
};
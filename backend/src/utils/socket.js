const { Server } = require('socket.io');

let io;

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowed = [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://100.102.175.73:5173',
          'http://100.102.175.73:5001'
        ];
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Users join rooms based on their email or user ID to receive targeted updates
    socket.on('join', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    // If not initialized, we return a mock or throw. 
    // Usually, we should ensure it's initialized during server startup.
    return null;
  }
  return io;
};

module.exports = { init, getIo };

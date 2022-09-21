const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const { instrument } = require('@socket.io/admin-ui');
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:34571',
      'https://admin.socket.io',
      'https://mellow-florentine-010ae1.netlify.app',
    ],
    credentials: true,
  },
});

instrument(io, {
  auth: false,
});

app.use(cors());
app.use(express.json());

let users = [];

io.on('connection', (socket) => {
  app.post('/login', (req, res) => {
    if (users.find((user) => user.username === req.body.username)) {
      res.status(409).json('Username already exists');
    } else {
      res.status(200).json('OK');
      socket.emit('add user', req.body.username);
    }
  });

  socket.on('add user', (username) => {
    users.push({ userId: socket.id, username });
    io.emit('user connected', username, users);
  });

  socket.on('chat message', (msg, username) => {
    socket.broadcast.emit('chat message', msg, username);
  });

  socket.on('private message', (msg, username, senderUsername) => {
    const receiverId = users.find((user) => user.username === username).userId;
    socket.to(receiverId).emit('private message', msg, senderUsername);
  });

  socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data));

  socket.on('disconnect', () => {
    socket.broadcast.emit(
      'user disconnected',
      users.find((user) => user.userId === socket.id),
      users.filter((user) => user.userId !== socket.id)
    );
    users = users.filter((user) => user.userId !== socket.id);
  });
});

server.listen(3001, () => {
  console.log('listening on *:3001');
});

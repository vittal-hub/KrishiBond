const http = require('http');

const app = require('./app');
const connectDB = require('./config/db');
const initSockets = require('./sockets');
const logger = require('./utils/logger');
const { port } = require('./config/env');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  // initSockets attaches its own 'upgrade' handler to `server` and returns
  // an io-shaped object ( io.to(room).emit(event, data) ) for controllers to use.
  const io = initSockets(server);

  // Make io available inside controllers via req.app.get('io')
  app.set('io', io);

  server.listen(port, () => {
    logger.info(`KissanBazaar API listening on port ${port}`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

start();

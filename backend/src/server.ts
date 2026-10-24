import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '4000', 10);
const app = createApp();

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MiniLedger backend server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Server terminated');
    process.exit(0);
  });
});

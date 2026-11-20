import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[Doomsday Ready Backend] Server listening on http://${HOST}:${PORT}`);
  console.log(`[Health check] http://${HOST}:${PORT}/api/health`);
});

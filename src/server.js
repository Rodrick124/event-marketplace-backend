import dotenv from 'dotenv';

dotenv.config();

import http from 'http';
import app from './app.js';
import { connectToDatabase } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
	await connectToDatabase();

	const server = http.createServer(app);
	server.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`Server running on http://localhost:${PORT}`);
	});
}

startServer().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('Failed to start server:', err);
	process.exit(1);
});



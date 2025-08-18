require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectToDatabase } = require('./config/db');

const PORT = process.env.PORT || 4000;

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



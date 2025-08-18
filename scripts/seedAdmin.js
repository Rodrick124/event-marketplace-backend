require('dotenv').config();
const { connectToDatabase } = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
	await connectToDatabase();
	const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
	const name = process.env.SEED_ADMIN_NAME || 'Admin';
	const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
	let user = await User.findOne({ email });
	if (!user) {
		user = await User.create({ name, email, password, role: 'admin' });
		// eslint-disable-next-line no-console
		console.log('Admin created:', { email, password });
	} else {
		// eslint-disable-next-line no-console
		console.log('Admin already exists:', email);
	}
	process.exit(0);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});



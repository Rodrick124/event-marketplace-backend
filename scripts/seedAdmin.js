require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
	await connectToDatabase();

	// Admin user
	const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
	const adminName = process.env.SEED_ADMIN_NAME || 'Admin';
	const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
	let adminUser = await User.findOne({ email: adminEmail });
	if (!adminUser) {
		adminUser = await User.create({ name: adminName, email: adminEmail, password: adminPassword, role: 'admin' });
		// eslint-disable-next-line no-console
		console.log('Admin created:', { email: adminEmail, password: adminPassword });
	} else {
		// eslint-disable-next-line no-console
		console.log('Admin already exists:', adminEmail);
	}

	await mongoose.connection.close();
	process.exit(0);
}

main().catch(async (err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	try {
		await mongoose.connection.close();
	} catch (_) {
		/* ignore */
	}
	process.exit(1);
});

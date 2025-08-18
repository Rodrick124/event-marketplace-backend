const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userProfileSchema = new mongoose.Schema(
	{
		avatar: String,
		phone: String,
		bio: String,
		organization: String,
	},
	{ _id: false }
);

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, index: true },
		password: { type: String, required: true, minlength: 6 },
		role: { type: String, enum: ['admin', 'organizer', 'attendee'], default: 'attendee', index: true },
		profile: userProfileSchema,
		status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
	},
	{ timestamps: true }
);

userSchema.pre('save', async function hashPasswordIfModified(next) {
	if (!this.isModified('password')) return next();
	const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
	this.password = await bcrypt.hash(this.password, saltRounds);
	next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
	return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);



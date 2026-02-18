const mongoose = require('mongoose');

const connect = async () => {
	try {
		await mongoose.connect(
			process.env.MONGO_URI || 'mongodb://localhost:27017/sentinelVN'
		);
		console.log('MongoDB connected 🚀');
	} catch (error) {
		console.error('MongoDB connection error:', error);
		process.exit(1);
	}
};

module.exports = { connect };

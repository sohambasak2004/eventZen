const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  const mongoUri =
    process.env.NODE_ENV === 'test' ? config.database.mongodbTestUri : config.database.mongodbUri;

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false
  });

  isConnected = true;

  mongoose.connection.on('error', () => {
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
  });
};

module.exports = {
  connectDB
};

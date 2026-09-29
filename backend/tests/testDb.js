const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongod;

// A single-node replica set (not a plain standalone MongoMemoryServer) -
// multi-document transactions (used by wallet settlement/withdrawal, see
// walletService.js) require a replica set to work at all. The real
// deployment target (MongoDB Atlas, even on the free tier) is always a
// replica set, so this keeps tests representative of production rather than
// silently skipping transaction behavior.
async function connect() {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
}

async function clearCollections() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

module.exports = { connect, clearCollections, disconnect };

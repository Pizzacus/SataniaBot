const {ShardingManager} = require('discord.js');
const config = require('./src/utils/config');

const manager = new ShardingManager('./src/bot.js', {
	token: config.token
});

function spawnShards() {
	// This variable is a JSON-encoded object that gets passed to the shard as args
	// The values are then de-serialized and attached to the client as client.startArgs
	// In the future, it may allow the manager to pass data to the shards at start
	// But it is currently unused
	const startArgs = JSON.stringify({});
	manager.shardArgs = [startArgs];

	return manager.spawn();
}

let totalShardLaunched = 0;

manager.on('launch', shard => {
	totalShardLaunched++;
	console.log(`Launched Shard ${shard.id} (${totalShardLaunched}/${manager.totalShards})`);
});

manager.on('message', (shard, message) => {
	if (message === 'exit') {
		process.exit();
	}
});

process.on('exit', () => {
	manager.respawn = false;

	for (const shard of manager.shards.values()) {
		shard.process.kill();
	}
});

spawnShards().catch(console.error);

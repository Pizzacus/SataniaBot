const fs = require('fs');
const path = require('path');
const {AkairoClient} = require('discord-akairo');
const sharp = require('sharp');
global.requireUtil = require('./utils/require-util');

const config = requireUtil('config');

sharp.concurrency(config.sharpConcurency);

const client = new AkairoClient({
	ownerID: config.owner,
	prefix: config.prefix,
	handleEdits: false,
	commandUtil: true,
	commandUtilLifetime: 600000,
	fetchMembers: true,
	emitters: {
		process
	},
	commandDirectory: './src/commands/',
	listenerDirectory: './src/listeners/',
	inhibitorDirectory: './src/inhibitors/'
}, {
	disableEveryone: true
});

if (!client.shard) {
	throw new Error('The shard manager (start.js) must be used to start the bot');
}

client.initArgs = JSON.parse(process.argv[2]);

const dir = path.resolve('data');

if (!fs.existsSync(dir)) {
	fs.mkdir(dir, err => {
		if (err) {
			console.error(err);
		}
	});
}

client.login()
	.then(() => console.log(`Shard ${client.shard.id} is ready!`))
	.catch(console.error);

require('./repl')(client);

const {AkairoClient} = require('discord-akairo');
const sharp = require('sharp');
global.requireUtil = require('./utils/require-util');

const config = requireUtil('config');

sharp.concurrency(config.sharpConcurency);

const client = new AkairoClient({
	ownerID: config.owner,
	prefix: 's!',
	handleEdits: true,
	commandUtil: true,
	commandUtilLifetime: 600000,
	fetchMembers: true,
	emitters: {
		process
	},
	commandDirectory: './src/commands/',
	listenerDirectory: './src/listeners/',
	inhibitorDirectory: './src/inhibitors'
});

if (!client.shard) {
	throw new Error('The shard manager (start.js) must be used to start the bot');
}

client.initArgs = JSON.parse(process.argv[2]);

client.once('ready', () => {
	console.log('Ready!');

	client.user.setPresence({
		status: 'online',
		afk: false,
		game: {
			name: 's!help | s!invite',
			type: 0
		}
	});
});

client.login();

require('./repl')(client);

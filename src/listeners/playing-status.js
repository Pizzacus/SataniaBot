const {Listener} = require('discord-akairo');

const options = {
	emitter: 'client',
	eventName: 'ready'
};

function setPresence(client) {
	client.user.setPresence({
		status: 'online',
		afk: false,
		game: {
			name: `${client.commandHandler.prefix()}help | ${client.commandHandler.prefix()}invite`,
			type: 0
		}
	});

	setTimeout(() => setPresence(client), 60 * 1000);
}

function exec() {
	const client = this.handler.emitters.get(this.emitter);
	setPresence(client);
}

module.exports = new Listener('status', exec, options);

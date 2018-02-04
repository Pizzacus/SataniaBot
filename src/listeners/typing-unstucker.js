const {Listener} = require('discord-akairo');

const config = requireUtil('config');

const options = {
	emitter: 'client',
	eventName: 'ready'
};

function exec() {
	const client = this.handler.emitters.get(this.emitter);

	if (!('maxTypingDuration' in config)) {
		return;
	}

	client.setInterval(() => {
		const typing = client.user._typing;

		for (const [id, entry] of typing) {
			if (!('since' in entry)) {
				entry.since = Date.now();
			}

			if (Date.now() - entry.since > config.maxTypingDuration) {
				console.log('Aborting typing...');
				client.channels.get(id).stopTyping(true);
				entry.since += 5000;
			}
		}
	}, 1000);
}

module.exports = new Listener('typing-unstucker', exec, options);

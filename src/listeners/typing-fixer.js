const {Listener} = require('discord-akairo');

const options = {
	emitter: 'client',
	eventName: 'ready'
};

class TypingHandler extends Map {
	constructor(iterable, client) {
		super(iterable);
		this.client = client;
		this._set = super.set;
	}

	set(key, value) {
		const old = this.get(key);

		if (old && old.interval) {
			this.client.clearInterval(old.interval);
		}

		if (value && value.promise) {
			console.warn('It seems like you have upgraded Discord.js to a version where the TypingHandler fix is no longer necessary, you should remove it.');
		}

		return this._set(key, value);
	}
}

function exec() {
	const client = this.handler.emitters.get(this.emitter);
	client.user._typing = new TypingHandler(client._typing, client);
}

module.exports = new Listener('typing-fixer', exec, options);

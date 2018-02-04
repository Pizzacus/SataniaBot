const {Listener} = require('discord-akairo');

const options = {
	eventName: 'unhandledRejection',
	emitter: 'process'
};

function exec(error) {
	console.error(error);
}

module.exports = new Listener('unhandled-rejection', exec, options);

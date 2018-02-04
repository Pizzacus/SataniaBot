const {Listener} = require('discord-akairo');

const options = {
	eventName: 'disconnect',
	emitter: 'process'
};

function exec() {
	console.log('Parent disconnected, exiting...');
	process.exit();
}

module.exports = new Listener('parent-disconnect', exec, options);

const {Command} = require('discord-akairo');

const options = {
	aliases: ['slower', 'slow', 'slowdown', 'speeddown']
};

async function exec(message) {
	return message.channel.send('no slower, only faster');
}

module.exports = new Command('slower', exec, options);

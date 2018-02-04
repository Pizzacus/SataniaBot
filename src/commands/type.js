const {Command} = require('discord-akairo');

async function exec(message) {
	return message.channel.startTyping();
}

const options = {
	aliases: ['type']
};

module.exports = new Command('type', exec, options);

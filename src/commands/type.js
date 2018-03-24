const {Command} = require('discord-akairo');

function exec(message) {
	return message.channel.startTyping();
}

const options = {
	aliases: ['type']
};

module.exports = new Command('type', exec, options);

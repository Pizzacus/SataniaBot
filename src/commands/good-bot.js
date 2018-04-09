const {Command} = require('discord-akairo');

const goodBotRegex = /^(good|best|great|nice|cool(est)?)\s+(bot|girl)\s*!*$/i;

const options = {
	trigger: goodBotRegex
};

async function exec(message) {
	const channelMessagesID = [...message.channel.messages.keys()];
	const lastMessageIndex = channelMessagesID[channelMessagesID.indexOf(message.id) - 1];

	if (!lastMessageIndex) {
		return;
	}

	const lastMessage = message.channel.messages.get(lastMessageIndex);

	if (lastMessage.author.id === message.client.user.id) {
		await message.react('♥');
	}
}

module.exports = new Command('goodbot', exec, options);

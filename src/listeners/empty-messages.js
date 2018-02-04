const {Listener} = require('discord-akairo');

const options = {
	emitter: 'client',
	eventName: 'message'
};

function exec(message) {
	if (
		message.author.id === message.client.user.id &&
		message.content.length === 0 &&
		message.attachments.size === 0 &&
		message.embeds.length === 0 &&
		message.type === 'DEFAULT'
	) {
		return message.channel.send(
			'**Error: Empty message detected.**\n' +
			'It seems like an empty message was just sent, this usually happens when the bot sends an embedded image and it gets blocked by the Discord content filter\n' +
			'(Even the avatars in embeds can cause this, it is very sensitive)\n' +
			'Unfortunatly, we have no real way to check when that happens as Discord does not return an error when it happen, so, sadly, your message was lost forever.\n\n' +
			'*(Only workaround for this is to remove content filtering, I know it\'s a terrible solution but it\'s not our fault)*'
		);
	}
}

module.exports = new Listener('empty-message', exec, options);

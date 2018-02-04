const {Command} = require('discord-akairo');
const Discord = require('discord.js');

const options = {
	aliases: ['help']
};

async function exec(message) {
	function helpDM(user) {
		if (user.id !== message.client.user.id && !user.bot) {
			const embed = new Discord.RichEmbed();
			embed.setTitle('Help for the Satania Bot!');
			embed.setColor('#ee6666');

			user.client.commandHandler.modules.map(command => {
				if (command.description) {
					embed.addField(user.client.commandHandler.prefix(message) + command.id, command.description);
				}
				return null;
			});

			user.send(embed);
		}
	}

	helpDM(message.author);

	const helpMessage = await message.channel.send('**👍 | Help has been sent!** Other people can react to this message to get it messaged to them as well!');
	const collector = helpMessage.createReactionCollector((reaction, user) => helpDM(user), {
		time: 60000
	});

	helpMessage.react('📧');

	collector.once('end', () => helpMessage.edit('**👍 | Help has been sent!**'));
}

module.exports = new Command('help', exec, options);

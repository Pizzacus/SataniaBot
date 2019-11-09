const {Command} = require('discord-akairo');
const Discord = require('discord.js');

const options = {
	aliases: ['help']
};

async function exec(message) {
	/**
	 * Send the Satania help to someone
	 * @param {Discord.User} user The user to DM
	 * @returns {undefined}
	 */
	async function helpDM(user) {
		if (user.id !== message.client.user.id && !user.bot) {
			let embed = new Discord.RichEmbed();
			embed.setTitle('Help for the Satania Bot!');
			embed.setColor('#ee6666');

			for (const command of user.client.commandHandler.modules.values()) {
				if (command.description) {
					const title = user.client.commandHandler.prefix(message) + command.id;
					const description = command.description + '\n\u2060';

					if (embed.length + title.length + description.length >= 6000 || embed.fields.length >= 25) {
						await user.send(embed);

						embed = new Discord.RichEmbed(); // eslint-disable-line
						embed.setColor('#ee6666');
					}

					embed.addField(title, description);
				}
			}

			await user.send(embed);
			await user.send('', {
				embed: {
					title: 'How to use image commands',
					description: `
Commands labelled as Image Commands (like s!pat, s!hug, s!kiss, ...) can all get images from a wide amount of sources.

These sources are:
• **Images directly attached to the message as a file**
• **URLs in the message,** they don't have to link directly to the image, Satania can often figure out what image to use from a web page
• **Avatars of mentioned users**
• **Emojis used in the message** (both default and custom)
• **The server icon,** when you use an everyone mention or write the name of the server
• **The last images uploaded in the chat,** by writing \`^^^^\` characters after the command and nothing else

If none of these matches, Satania will attempt to search the username among the members of the server, this allows you to use image commands on people without mentioning them.

**Have fun with them! ♥**
					`.trim(),
					color: 0xEE6666
				}
			});
		}
	}

	helpDM(message.author);

	if (message.channel.type === 'text') {
		const helpMessage = await message.channel.send('**👍 | Help has been sent!** Other people can react to this message to get it messaged to them as well!');
		const collector = helpMessage.createReactionCollector((reaction, user) => helpDM(user), {
			time: 60000
		});

		helpMessage.react('📧');

		collector.once('end', () => helpMessage.edit('**👍 | Help has been sent!**'));
	}
}

module.exports = new Command('help', exec, options);

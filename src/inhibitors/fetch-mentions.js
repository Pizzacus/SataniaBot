const Discord = require('discord.js');
const {Inhibitor} = require('discord-akairo');

const options = {
	type: 'pre'
};

async function exec(message) {
	const client = this.client;
	const userRegex = /<@!?(\d+)>/g;
	const mentions = [];

	let match;
	while ((match = userRegex.exec(message.content)) !== null) {
		mentions.push(match[1]);
	}

	const users = await Promise.all(
		mentions.map(user => client.fetchUser(user)
			.catch(() => null))
	);

	message.mentions = new Discord.MessageMentions(
		message,
		new Discord.Collection(
			users
				.filter(val => Boolean(val))
				.map(user => [user.id, user])
		),
		message.mentions.roles,
		message.mentions.everyone
	);

	if (message.guild) {
		mentions.push(message.author.id);
		await Promise.all(
			mentions.map(user => 
				message.guild.fetchMember(user)
					.catch(() => null)
			)
		);
	}
}

module.exports = new Inhibitor('fetch-mentions', exec, options);

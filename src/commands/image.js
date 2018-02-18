const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');

async function exec(message) {
	const link = relevantLink(message);

	if (!link) {
		return message.reply('link is `null` or evaluates to false');
	}

	return message.reply(`
**Name**: ${link.name}
**Type**: ${link.type}
**Source**: \`${link.source}\`
**URL**: <${link.url}>
`,
		{
			files: [await fetchImage(link.url)]
		}
	);
}

const options = {
	aliases: ['image']
};

module.exports = new Command('image', exec, options);

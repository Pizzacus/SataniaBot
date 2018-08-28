const {Command} = require('discord-akairo');
const fileType = require('file-type');

const {isSVG} = requireUtil('svg-utils');
const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');

async function exec(message) {
	const link = relevantLink(message);

	if (!link) {
		return message.reply('link is `null` or evaluates to false');
	}

	const file = await fetchImage(link.url);
	let ext = fileType(file);

	if (ext) {
		ext = ext.mime;
	} else if (isSVG(file)) {
		ext = 'svg';
	}

	return message.reply(
		`
**Name**: ${link.name}
**Type**: ${link.type}
**Source**: \`${link.source}\`
**URL**: <${link.url}>
		`.trim(),
		{
			files: [{
				name: `image.${ext}`,
				attachment: file
			}]
		}
	);
}

const options = {
	aliases: ['image']
};

module.exports = new Command('image', exec, options);

const fs = require('fs');
const path = require('path');
const {Command} = require('discord-akairo');

const smugList = fs.readFileSync(path.resolve('assets/smug-list.txt'), 'utf8')
	.split('\n')
	.map(line => line.trim())
	.filter(line => !line.startsWith('#') && line.length > 0);

const options = {
	aliases: ['smug', 'smugs', 'smugface'],
	args: [{
		id: 'smug',
		type: 'integer',
		match: 'content',
		default: false
	}],
	description: 'Sends a picture of a smug anime character.\n' +
	'By default, the command is random, but every smug has a unique number associated to it, so you can call a specific smug by adding that number.\n' +
	'__**Examples:**__ `s!smug` or `s!smug 1234`'
};

async function exec(message, args) {
	const selectedSmug = (typeof args.smug === 'number') ? args.smug : Math.floor(Math.random() * smugList.length) + 1;

	let image = smugList[(((selectedSmug - 1) % smugList.length) + smugList.length) % smugList.length];

	if (!isFinite(selectedSmug)) {
		return message.reply(`**Number too big, smug machine :b:roke**, we only have ${Number.MAX_VALUE} smugs`);
	}

	const extension = image.match(/.+\.(\w+)/i)[1];

	if (selectedSmug === 666) {
		image = 'http://smug.satania.moe/Smug_152.png';
	}

	return message.channel.send(`**Here is smug #${selectedSmug}**`, {
		files: [{
			name: `Smug_${selectedSmug}.${extension}`,
			attachment: image
		}]
	});
}

module.exports = new Command('smug', exec, options);

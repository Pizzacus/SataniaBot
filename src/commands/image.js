const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');

async function exec(message) {
	const image = relevantLink(message);
	await message.reply({
		files: [await fetchImage(image.url)]
	});
}

const options = {
	aliases: ['image']
};

module.exports = new Command('image', exec, options);

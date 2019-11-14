const {Command} = require('discord-akairo');
const Discord = require('discord.js');
const Clarifai = require('clarifai');
const sharp = require('sharp');
const {Inflectors} = require('en-inflectors');
const indefinite = require('indefinite');
const lexi = require('en-lexicon');

const {optimalDensity} = requireUtil('svg-utils');
const config = requireUtil('config');
const relevantLink = requireUtil('relevant-link');
const fetchImage = requireUtil('fetch-image');

// NLP override
const ARE_NOUNS = new Set(['costume', 'constructor', 'cityscape', 'blur', 'wear', 'outdoors', 'kimono', 'closeup', 'accessory']);
const NOT_NOUNS = new Set(['fun', 'kind', 'disjunct', 'ball-shaped', 'vintage']);
const SKIP_WORDS = new Set(['one', 'people', 'no person', 'graphic', 'vector']);
const ARE_COUNTABLE = new Set(['woman']);
const NOT_COUNTABLE = new Set(['horror', 'springtime', 'summer', 'fall', 'winter', 'baking', 'affection', 'togetherness', 'romance', 'ivory', 'fashion', 'art', 'marijuana', 'healthcare', 'cannabis', 'plastic', 'geography', 'simplicity', 'creativity', 'swimming', 'glamour', 'vandalism', 'fright', 'curiosity', 'patriotism']);
const NOUN_LIKE = ['NN', 'NNS', 'NNP', 'NNPS', 'VBG'];
const ADJECTIVE_LIKE = ['JJ', 'CD'];

let clarifai;

const options = {
	aliases: ['look', 'vision', 'recognise', 'recognize'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'Ask Satania what she sees on an image\n' +
		'__**Image command, see below.**__'
};

function list(arr) {
	if (arr.length === 0) {
		return String(arr[0]);
	}

	if (arr.length === 1) {
		return arr.join(' and ');
	}

	return arr.slice(0, arr.length - 1).join(', ') + ', and ' + arr[arr.length - 1];
}

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('Give me an image to look at, and I\'ll tell you what I see.');
		return;
	}

	await message.channel.startTyping();

	const image = await fetchImage(link.url);
	const converted = await sharp(image, {
		density: optimalDensity(image, 800, 800)
	})
		.toFormat('png')
		.toBuffer();

	const res = await clarifai.models.predict(
		Clarifai.GENERAL_MODEL,
		{
			base64: converted.toString('base64')
		}
	);

	const tags = res.outputs[0].data.concepts;

	const keywords = tags.map(concept => concept.name);
	const nouns = [];
	const adjectives = [];

	for (const label of keywords) {
		if (SKIP_WORDS.has(label)) {
			continue;
		}

		let noun;
		let countable = !NOT_COUNTABLE.has(label);
		const words = label.split(/\s+/g);

		for (const word of words) {
			let purpose;

			if (NOT_NOUNS.has(word)) {
				continue;
			}

			if (ARE_NOUNS.has(word)) {
				purpose = 'NN';
			} else {
				purpose = (lexi.lexicon[word] || 'NN')
					.split(/\|/g)
					.find(purpose => [...NOUN_LIKE, ...ADJECTIVE_LIKE].includes(purpose));
			}

			console.log(purpose, lexi.lexicon[word]);

			if (NOUN_LIKE.includes(purpose)) {
				// It's a noun

				noun = word;

				if (ARE_COUNTABLE.has(label)) {
					countable = true;
				} else if (NOT_COUNTABLE.has(label)) {
					countable = false;
				} else if (purpose === 'NN') {
					const inflector = new Inflectors(word);

					countable = inflector.isCountable();
				} else {
					countable = false;
				}

				break;
			}
		}

		if (noun) {
			if (countable) {
				nouns.push(
					indefinite(label, {
						articleOnly: true
					}) +
					` **${label}**`
				);
			} else {
				nouns.push(`**${label}**`);
			}
		} else {
			adjectives.push(`**${label}**`);
		}
	}

	const embed = new Discord.RichEmbed();

	embed.setDescription(`On this image, I see ${list(nouns.slice(0, 10))}.\n\nIt looks ${list(adjectives.slice(0, 10))}.`);
	embed.attachFiles([{
		name: 'image.png',
		attachment: converted
	}]);
	embed.setImage('attachment://image.png');

	embed.setColor('#2962ff');
	embed.setFooter('AI by Clarifai (clarifai.com)', 'https://github.com/Clarifai.png');

	await message.channel.send(embed);
	await message.channel.stopTyping();
}

if (config.clarifaiKey) {
	clarifai = new Clarifai.App({
		apiKey: config.clarifaiKey
	});

	module.exports = new Command('look', exec, options);
}

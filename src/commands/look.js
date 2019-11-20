const {Command} = require('discord-akairo');
const Discord = require('discord.js');
const Clarifai = require('clarifai');
const sharp = require('sharp');
const {Inflectors} = require('en-inflectors');
const indefinite = require('indefinite');
const lexi = require('en-lexicon');
const fileType = require('file-type');

const {optimalDensity} = requireUtil('svg-utils');
const config = requireUtil('config');
const relevantLink = requireUtil('relevant-link');
const fetchImage = requireUtil('fetch-image');
const formats = requireUtil('get-supported-formats')();

// NLP override
const ARE_NOUNS = new Set(['costume', 'constructor', 'cityscape', 'blur', 'wear', 'outdoors', 'kimono', 'closeup', 'accessory']);
const NOT_NOUNS = new Set(['fun', 'kind', 'disjunct', 'ball-shaped', 'vintage']);
const SKIP_WORDS = new Set(['one', 'people', 'no person', 'graphic', 'vector']);
const ARE_COUNTABLE = new Set(['woman']);
const NOT_COUNTABLE = new Set([
	'horror',
	'springtime',
	'summer',
	'fall',
	'winter',
	'baking',
	'affection',
	'togetherness',
	'romance',
	'ivory',
	'fashion',
	'art',
	'marijuana',
	'healthcare',
	'cannabis',
	'plastic',
	'geography',
	'simplicity',
	'creativity',
	'swimming',
	'glamour',
	'vandalism',
	'fright',
	'curiosity',
	'patriotism',
	'entertainment'
]);
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
	if (arr.length < 3) {
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

	console.log(`[${new Date().toLocaleTimeString()}] Look request from: ${message.author.tag} (${message.author.id})`);

	await message.channel.startTyping();

	let image = await fetchImage(link.url, {
		imageMime: [
			...formats,
			'image/bmp'
		]
	});
	const type = fileType(image);

	// The Clarifai docs say they support WEBP but this desn't appear to be the case
	if (!type || !['jpg', 'png', 'tif', 'bmp'].includes(type.ext)) {
		const img = await sharp(image, {
			density: optimalDensity(image, 800, 800)
		});

		const stats = await img.stats();

		image = await img.toFormat(stats.isOpaque ? 'jpg' : 'png').toBuffer();
	}

	const res = await clarifai.models.predict(
		Clarifai.GENERAL_MODEL,
		{
			base64: image.toString('base64')
		}
	);

	const tags = res.outputs[0].data.concepts;

	const {adjectives, nouns} = processKeywords(tags);

	const hasPeople = !tags.some(tag => tag.id === 'ai_786Zr311'); // Check for "no person" tag
	const people = [];

	if (hasPeople) {
		const res = await clarifai.models.predict(
			Clarifai.DEMOGRAPHICS_MODEL,
			{
				base64: image.toString('base64')
			}
		);

		if (res.outputs[0].data.regions) {
			for (const data of res.outputs[0].data.regions) {
				const face = data.data.face;
				const region = data.region_info;

				people.push({
					age: parseInt(face.age_appearance.concepts[0].name, 10),
					gender: face.gender_appearance.concepts.find(val => val.id === 'ai_cVWr8NK5').value, // Value of femininity
					position: {
						y: region.bounding_box.top_row,
						height: region.bounding_box.bottom_row - region.bounding_box.top_row,
						x: region.bounding_box.left_col,
						width: region.bounding_box.right_col - region.bounding_box.left_col
					}
				});
			}
		}
	}

	let description = '';

	if (nouns.length > 0) {
		description += `On this image, I see ${list(nouns.slice(0, 10))}.\n\n`;
	} else {
		description += 'On this image, I can\'t see anything.\n\n';
	}

	if (adjectives.length > 0) {
		description += `It looks ${list(adjectives.slice(0, 10))}.\n\n`;
	} else {
		description += 'It looks undefinable.\n\n';
	}

	const GENDER_DESCRIPTION = [
		'looks like a boy',
		'looks somewhat like a boy',
		'has an ambiguous gender',
		'looks somewhat like a girl',
		'looks like a girl'
	];

	const peopleDescriptions = people.map(person =>
		`${indefinite(person.age, {articleOnly: true})} **${person.age} year${person.age === 1 ? '' : 's'}-old** ` +
		`that **${GENDER_DESCRIPTION[Math.floor(person.gender * GENDER_DESCRIPTION.length)]}**`
	);

	if (!hasPeople) {
		description += 'At a quick glance, **I can\'t see anyone.**\n\n';
	} else if (people.length === 0) {
		description += 'After looking thoroughly, **I can\'t see anyone.**\n\n';
	} else if (people.length === 1) {
		description += `I think I see **someone** that appears to be ${peopleDescriptions[0]}.\n\n`;
	} else {
		description += `I think I see **${people.length.toLocaleString()} people,** they appear to be ${list(peopleDescriptions)}.\n\n`;
	}

	if (people.length > 0) {
		image = await generateFaceHighlight(image, people);
	}

	const embed = new Discord.RichEmbed();

	embed.setDescription(description);
	embed.attachFiles([{
		name: 'image.png',
		attachment: image
	}]);
	embed.setImage('attachment://image.png');

	embed.setColor('#2962ff');
	embed.setFooter('AI by Clarifai (clarifai.com)', 'https://github.com/Clarifai.png');

	if (people.length > 0) {
		embed.footer.text += ' | Note: Don\'t take age and gender detection too seriously. I\'m just a robot! I\'m not as accurate as a real person!';
	}

	await message.channel.send(embed);
	await message.channel.stopTyping();
}

function processKeywords(tags) {
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

	return {adjectives, nouns};
}

async function generateFaceHighlight(image, people) {
	const img = sharp(image);
	const {width, height} = await img.metadata();

	let svg = `
	<svg
		width="${width}"
		height="${height}"
	>

	`;

	for (const person of people) {
		const GENDER_DESCRIPTION = [
			'boy',
			'boy?',
			'???',
			'girl?',
			'girl'
		];

		const GENDER_COLOURS = [
			'#1AD9FF',
			'#80EAFF',
			'#FFFF00',
			'#FF80EA',
			'#FF33DD'
		];

		svg += `<rect
			x="${person.position.x * 100}%"
			y="${person.position.y * 100}%"
			width="${person.position.width * 100}%"
			height="${person.position.height * 100}%"
			fill="none"
			rx="15"
			stroke-width="0.5%"
			stroke="#ffff00"
		/>

		<rect
			x="${((person.position.x + (person.position.width / 2)) * width) - (height / 30 * 7 / 2)}px"
			y="${(person.position.y + person.position.height + 0.02) * height}px"
			width="${height / 30 * 7}px"
			height="${height / 30}px"
			fill="#000"
			stroke="#000"
			stroke-width="0.5%"
			opacity="0.5"
		/>
		
		<text
			x="${(person.position.x + (person.position.width / 2)) * 100}%"
			y="${((person.position.y + person.position.height + 0.05) * height)}px"
			text-anchor="middle"
			fill="${GENDER_COLOURS[Math.floor(person.gender * GENDER_COLOURS.length)]}"
			style="box-shadow: 4px 4px 0 #000;"
			font-size="${height * 0.03}px"
			font-family="'Sans'"
			font-weight="bold">
				${person.age} y/o, ${GENDER_DESCRIPTION[Math.floor(person.gender * GENDER_DESCRIPTION.length)]}
		</text>`;
	}

	svg += '</svg>';

	return img.composite([
		{
			input: Buffer.from(svg)
		}
	])
		.toFormat('jpg');
}

if (config.clarifaiKey) {
	clarifai = new Clarifai.App({
		apiKey: config.clarifaiKey
	});

	module.exports = new Command('look', exec, options);
}

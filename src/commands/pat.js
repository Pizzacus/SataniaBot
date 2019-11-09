const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['pat', 'pet', 'pats', 'pets'],
	args: [
		{
			id: 'user',
			type: 'relevant',
			match: 'content'
		}
	],
	description:
		'Sends a picture of someone being pat, we only provide the comfiest pats!\n' +
		'__**Image command, see below.**__'
};

const variants = [
	[
		'./assets/pat/01.jpg',
		{
			height: 180,
			width: 180,
			x: 292,
			y: 32
		},
		'./assets/pat/01-overlay.png'
	],
	[
		'./assets/pat/02.jpg',
		{
			height: 240,
			width: 240,
			x: 50,
			y: 35
		},
		'./assets/pat/02-overlay.png'
	],
	[
		'./assets/pat/03.jpg',
		{
			height: 180,
			width: 180,
			x: 105,
			y: 55
		},
		'./assets/pat/03-overlay.png'
	],
	[
		// Sumbitted by Hitsugaya#8973
		'./assets/pat/04.jpg',
		{
			height: 140,
			width: 140,
			x: 10,
			y: 155
		}
	],
	[
		'./assets/pat/05.jpg',
		{
			height: 200,
			width: 200,
			x: 275,
			y: 40
		},
		'./assets/pat/05-overlay.png'
	],
	[
		'./assets/pat/06.jpg',
		{
			height: 240,
			width: 240,
			x: 55,
			y: 55
		},
		'./assets/pat/06-overlay.png'
	],
	[
		'./assets/pat/07.jpg',
		{
			height: 240,
			width: 240,
			x: 90,
			y: 60
		},
		'./assets/pat/07-overlay.png'
	],
	[
		'./assets/pat/08.jpg',
		{
			height: 180,
			width: 180,
			x: 240,
			y: 75
		},
		'./assets/pat/08-overlay.png'
	],
	[
		'./assets/pat/09.jpg',
		{
			height: 180,
			width: 180,
			x: 100,
			y: 120
		},
		'./assets/pat/09-overlay.png'
	],
	[
		'./assets/pat/10.jpg',
		{
			height: 220,
			width: 220,
			x: 85,
			y: 50
		},
		'./assets/pat/10-overlay.png'
	],
	[
		// Sumbitted by Hahahahaha#0420
		'./assets/pat/11.jpg',
		{
			height: 230,
			width: 230,
			x: 75,
			y: 50
		},
		'./assets/pat/11-overlay.png'
	],
	[
		// Sumbitted by reimu#3487
		'./assets/pat/12.jpg',
		{
			height: 160,
			width: 160,
			x: 75,
			y: 60
		},
		'./assets/pat/12-overlay.png'
	]
];

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping();

	if (
		(link.type === 'user' || link.type === 'member') &&
		link.source.id === message.author.id
	) {
		await message.channel.send(
			`${message.author}, are you really that desperate to be patted?`,
			{
				files: [
					{
						attachment: './assets/sadness.gif'
					}
				]
			}
		);

		return message.channel.stopTyping();
	}

	const image = variants[Math.floor(Math.random() * variants.length)].slice();

	image[1] = {
		...image[1],
		image: fetchImage(link.url),
		background: '#36393e'
	};

	const self = (link.type === 'user' || link.type === 'member') &&
	link.source.id === message.client.user.id;

	const reply = await message.channel.send(
		`**${link.name}** was patted successfully!${self ? ' **Thank you!!!**' : ''} \u2764`,
		{
			files: [
				{
					name: 'image.jpeg',
					attachment: await render(...image).then(result =>
						result
							.jpeg({
								quality: 50
							})
							.toBuffer()
					)
				}
			]
		}
	);

	if (self) {
		reply.react('♥');
	}

	await message.channel.stopTyping();
}

module.exports = new Command('pat', exec, options);

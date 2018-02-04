// TODO: This whole thing is terrible, this is the only command that wasn't rewritten when I made the Satania rewrite

function parseConvertionInput(input) {
	let units = {
		type: undefined
	};
	const unitRegex = /(-?[\d,.]+)(?:\s?([^\d\s]+))?/g;

	const imperialUnits = [
		'inch', 'inches', 'in', '"',
		'foot', 'feet', 'ft', '\'',
		'yard', 'yards', 'yd',
		'chain', 'chains', 'ch',
		'furlong', 'furlongs', 'fur',
		'mile', 'miles', 'ml'
	];

	const metricUnits = [
		'millimeters', 'millimeter', 'mm',
		'centimeters', 'centimeter', 'cm',
		'decimeters', 'decimeter', 'dm',
		'meters', 'meter', 'm',
		'decameters', 'decameter', 'dam',
		'hectometers', 'hectometer', 'hm',
		'kilometers', 'kilometer', 'km'
	];

	let value;

	while ((value = unitRegex.exec(input)) !== null) {
		value[1] = parseFloat(value[1].replace(/,/g, '.'), 10);

		if (value[2] && imperialUnits.indexOf(value[2].toLowerCase()) >= 0) {
			// IMPERIAL UNITS

			if (typeof units.type === 'undefined') {
				units = {
					type: 'imperial',
					inches: 0
				};
			}

			if (['inch', 'inches', 'in', '"'].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1];
			} else if (['foot', 'feet', 'ft', '\''].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1] * 12;
			} else if (['yard', 'yards', 'yd'].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1] * 12 * 3;
			} else if (['chain', 'chains', 'ch'].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1] * 12 * 3 * 22;
			} else if (['furlong', 'furlongs', 'fur'].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1] * 12 * 3 * 22 * 10;
			} else if (['mile', 'miles', 'ml'].indexOf(value[2].toLowerCase()) >= 0) {
				units.inches += value[1] * 12 * 3 * 22 * 10 * 8;
			}
		} else if (value[2] && metricUnits.indexOf(value[2].toLowerCase()) >= 0) {
			// METRIC UNITS

			if (typeof units.type === 'undefined') {
				units = {
					type: 'metric',
					meters: 0
				};

				if (/^(millimeters?|mm)$/i.test(value[2])) {
					units.meters += value[1] * 0.001;
				} else if (/^(centimeters?|cm)$/i.test(value[2])) {
					units.meters += value[1] * 0.01;
				} else if (/^(decimeters?|dm)$/i.test(value[2])) {
					units.meters += value[1] * 0.1;
				} else if (/^(meters?|m)$/i.test(value[2])) {
					units.meters += Number(value[1]);
				} else if (/^(decameters?|dam)$/i.test(value[2])) {
					units.meters += value[1] * 10;
				} else if (/^(hectometers?|hm)$/i.test(value[2])) {
					units.meters += value[1] * 100;
				} else if (/^(kilometers?|km)$/i.test(value[2])) {
					units.meters += value[1] * 1000;
				}
			}
		} else {
			return {
				type: 'error'
			};
		}
	}

	return units;
}

const {Command} = require('discord-akairo');

const options = {
	aliases: ['convert'],
	args: [{
		id: 'convert',
		match: 'content'
	}],
	description: 'Very handy command to convert lengths from the metric system to imperial, and vice-versa!\n__**Examples:**__: `s!convert 1km`, `s!convert 6.5 miles`, `s!convert 6 meters`, `s!convert 5\'6"`'
};

function exec(message, args) {
	const units = parseConvertionInput(args.convert);

	if (units.type === 'imperial') {
		const meters = units.inches * 0.0254;

		if (meters >= 1000) {
			return message.reply(`That would be ${Math.round(meters / 1000 * 100) / 100} kilometers!`);
		} else if (meters >= 1) {
			return message.reply(`That would be ${Math.round(meters * 100) / 100} meters!`);
		} else if (meters >= 0.01) {
			return message.reply(`That would be ${Math.round(meters * 100 * 100) / 100} centimeters!`);
		}
		return message.reply(`That would be ${Math.round(meters * 1000 * 100000) / 100000} millimeters!`);
	} else if (units.type === 'metric') {
		const inches = units.meters / 0.0254;

		if (inches >= 63360) {
			return message.reply(`That would be ${Math.round(inches / 63360 * 100) / 100} miles!`);
		} else if (inches > 180) {
			return message.reply(`That would be ${Math.round(inches / 12 * 100) / 100} feet!`);
		} else if (inches >= 12) {
			return message.reply(`That would be ${Math.floor(inches / 12)}'${Math.floor(inches) % 12}"!`);
		}
		return message.reply(`That would be ${Math.round(inches * 100000) / 100000} inches!`);
	} else if (units.type === 'error') {
		return message.reply('There was an error processing your mesurements.\nMaybe you typed something like `5\'4` or `1m50` these notation aren\'t supported, use `5\'4"` and `1.5m` instead');
	}
}

module.exports = new Command('convert', exec, options);

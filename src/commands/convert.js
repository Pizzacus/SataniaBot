const {Command} = require('discord-akairo');

const options = {
	aliases: ['convert'],
	args: [{
		id: 'convert',
		match: 'content'
	}],
	description: 'Very handy command to convert lengths from the metric ' +
		'system to imperial, and vice-versa!\n' +
		'__**Examples:**__: `s!convert 1km`, `s!convert 6.5 miles`, ' +
		'`s!convert 6 meters`, `s!convert 5\'6"`'
};

/**
 * A length unit used for unit conversion
 * @typedef {object} LengthUnit
 * @property {string} symbol The symbol of a unit
 * @property {array<string>} names User-friendly names of the unit
 * @property {number} multiplier The multiplier relative to the base unit (which
 *  has this property set to 1)
 */
const imperialUnits = [
	{
		symbol: 'in',
		names: ['inch', 'inches', '"'],
		multiplier: 1
	},
	{
		symbol: 'ft',
		names: ['foot', 'feet', '\''],
		multiplier: 12
	},
	{
		symbol: 'yd',
		names: ['yard', 'yards'],
		multiplier: 12 * 3
	},
	{
		symbol: 'ch',
		names: ['chain', 'chains'],
		multiplier: 12 * 3 * 22
	},
	{
		symbol: 'fur',
		names: ['furlong', 'furlongs'],
		multiplier: 12 * 3 * 22 * 10
	},
	{
		symbol: 'ml',
		names: ['mile', 'miles'],
		multiplier: 12 * 3 * 22 * 10 * 8
	}
];

const metricUnits = [
	{
		symbol: 'mm',
		names: ['millimeter', 'millimeters'],
		multiplier: 0.001
	},
	{
		symbol: 'cm',
		names: ['centimeter', 'centimeters'],
		multiplier: 0.01
	},
	{
		symbol: 'dm',
		names: ['decimeter', 'decimeters'],
		multiplier: 0.1
	},
	{
		symbol: 'm',
		names: ['meter', 'meters'],
		multiplier: 1
	},
	{
		symbol: 'dam',
		names: ['decameter', 'decameters'],
		multiplier: 10
	},
	{
		symbol: 'hm',
		names: ['hectometer', 'hectometers'],
		multiplier: 100
	},
	{
		symbol: 'km',
		names: ['kilometer', 'kilometers'],
		multiplier: 1000
	}
];

/**
 * Convert a user-friendly name of a unit to the unit's symbol, eg.
 * "meters" -> "m", "meter" -> "m", "m" -> "m"
 * @param {array<LengthUnit>} units An array of units to look up
 * @param {string} text A string to be matched
 * @returns {?string} The unit's symbol or null
 */
function getUnitSymbol(units, unitName) {
	const matchingUnit = units
		.find(unit => unit.symbol === unitName || unit.names.includes(unitName));

	return matchingUnit ? matchingUnit.symbol : null;
}

/**
 * Execute a regular expression and return all matching values (a RegExp with
 * the global flag can match multiple values in a single string)
 * @param {RegExp} regexp A RegExp to match the string against
 * @param {string} text A string to be matched
 * @returns {array} An array containing all results of RegExp#exec
 */
function getAllMatches(regexp, text) {
	const results = [];
	let value;

	while ((value = regexp.exec(text)) !== null) {
		results.push(value);
	}

	return results;
}

/**
 * Parse user input containing length units and return them in a normalized
 * format of an array of [number, unit symbol]
 * @param {string} text User input
 * @param {array<array<LengthUnit>>} unitSystems All supported unit systems
 * @returns {array<array<number, string>>} An array of recognized units and values
 */
function parseUnits(text, unitSystems) {
	const allUnits = unitSystems.reduce((units, system) => [...units, ...system]);
	const parts = getAllMatches(/(-?[\d,.]+)(?:\s?([^\d\s]+))?/g, text)
		.map(match => match.slice(1, 3))
		.map(part => ({
			value: parseFloat(/^[\d]+,[\d]+$/.test(part[0]) ?
				part[0].replace(',', '.') :
				part[0].replace(/,/g, ''), 10),
			symbol: getUnitSymbol(allUnits, part[1])
		}));

	return parts;
}

function exec(message, args) {
	const unitSystems = [imperialUnits, metricUnits];
	const input = parseUnits(args.convert, unitSystems);
	const units = unitSystems
		.find(units =>
			input.every(part => units.some(unit => unit.symbol === part.symbol))
		);

	if (input.length === 0 || !units) {
		// User's input is incomprehensible, give up
		return message.reply('There was an error processing your measurements.\n' +
			'Maybe you typed something like `5\'4` or `1m50`, these ' +
			'notations aren\'t supported, use `5\'4"` and `1.5m` instead.');
	}

	// The unit is inches for imperial and meters for metric
	const sum = input
		.map(part => {
			const unit = units.find(unit => unit.symbol === part.symbol);
			return part.value * unit.multiplier;
		}).reduce((sum, number) => sum + number);

	const inch = 0.0254;
	let output;

	if (units === imperialUnits) {
		const meters = sum * inch;

		if (meters >= 1000) {
			output = `${Math.round(meters / 1000 * 100) / 100} kilometers`;
		} else if (meters >= 1) {
			output = `${Math.round(meters * 100) / 100} meters`;
		} else if (meters >= 0.01) {
			output = `${Math.round(meters * 100 * 100) / 100} centimeters`;
		} else {
			output = `${Math.round(meters * 1000 * 100000) / 100000} millimeters`;
		}
	} else if (units === metricUnits) {
		const inches = sum / inch;

		if (inches >= 63360) {
			output = `${Math.round(inches / 63360 * 100) / 100} miles`;
		} else if (inches > 180) {
			output = `${Math.round(inches / 12 * 100) / 100} feet`;
		} else if (inches >= 12) {
			output = `${Math.floor(inches / 12)}'${Math.floor(inches) % 12}"`;
		} else {
			output = `${Math.round(inches * 100000) / 100000} inches`;
		}
	}

	return message.reply(`That would be ${output}!`);
}

module.exports = new Command('convert', exec, options);

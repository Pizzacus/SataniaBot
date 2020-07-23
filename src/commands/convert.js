const {Command} = require('discord-akairo');

const options = {
	aliases: ['convert'],
	args: [
		{
			id: 'convert',
			match: 'content'
		}
	],
	description:
		'Very handy command to convert units from the metric ' +
		'system to imperial, and vice-versa!\n' +
		'__**Examples:**__: `s!convert 1km`, `s!convert 6.5 miles`, ' +
		'`s!convert 6 meters`, `s!convert 5\'6"`'
};

const inch = 0.0254;
const pound = 453.59237;
const fluidOunces = 0.0295735;

/**
 * A length unit used for unit conversion
 * @typedef {object} LengthUnit
 * @property {string} symbol The symbol of a unit
 * @property {Array<string>} names User-friendly names of the unit
 * @property {number} multiplier The multiplier relative to the base unit (which
 *  has this property set to 1)
 */

// Each base unit is an object inside each system.
// Each base unit contains its conversion function which converts to the opposite base unit (like metric to imperial).
// And the units of the base unit.

const imperialUnits = {
	fahrenheit: {
		convert: sum => prefixUnit([metricUnits.celsius.units[0]], (sum - 32) * (5 / 9)),
		units: [
			{
				symbol: 'F',
				names: ['fahrenheit', 'f'],
				multiplier: 1
			}
		]
	},
	rankine: {
		convert: sum => prefixUnit([metricUnits.celsius.units[0]], (sum - 491.67) * (5 / 9)),
		units: [
			{
				symbol: 'R',
				names: ['rankine', 'r'],
				multiplier: 1
			}
		]
	},
	volume: {
		convert: sum => simpleConvert(sum, fluidOunces, metricUnits.volume, ['l', 'ml']),
		units: [
			{
				symbol: 'fl oz',
				names: ['fluid ounce', 'fluid ounces'],
				multiplier: 1
			},
			{
				symbol: 'gi',
				names: ['gill', 'gills'],
				multiplier: 5
			},
			{
				symbol: 'pt',
				names: ['pint', 'pints'],
				multiplier: 20
			},
			{
				symbol: 'qt',
				names: ['quart', 'quarts'],
				multiplier: 40
			},
			{
				symbol: 'gal',
				names: ['gallon', 'gallons'],
				multiplier: 128
			},
			{
				symbol: 'impgal',
				names: ['imperial gallon', 'imperial gallons'],
				multiplier: 160
			}
		]
	},
	weight: {
		convert: sum => simpleConvert(sum, pound, metricUnits.weight, ['kg', 'g', 'mg']),
		units: [
			{
				symbol: 'gr',
				names: ['grain', 'grains'],
				multiplier: 1 / 7000
			},
			{
				symbol: 'dr',
				names: ['drachm', 'drachms'],
				multiplier: 1 / 256
			},
			{
				symbol: 'oz',
				names: ['ounce', 'ounces'],
				multiplier: 1 / 16
			},
			{
				symbol: 'lbs',
				names: ['pound', 'pounds'],
				multiplier: 1
			},
			{
				symbol: 'st',
				names: ['stone', 'stones'],
				multiplier: 14
			},
			{
				symbol: 'qtr',
				names: ['quarter', 'quarters'],
				multiplier: 28
			},
			{
				symbol: 'cwt',
				names: ['hundredweight', 'hundredweights'],
				multiplier: 112
			},
			{
				symbol: 't',
				names: ['ton', 'tons'],
				multiplier: 2240
			}
		]
	},
	lengths: {
		convert: sum => simpleConvert(sum, inch, metricUnits.volume, ['km', 'm', 'cm', 'mm']),
		units: [
			{
				symbol: 'in',
				names: ['inch', 'inches', '"'],
				multiplier: 1
			},
			{
				symbol: 'ft',
				names: ['foot', 'feet', 'foots', 'feets', '\''],
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
		]
	}
};

const metricUnits = {
	celsius: {
		convert: sum => prefixUnit([imperialUnits.fahrenheit.units[0]], (sum * (9 / 5)) + 32),
		units: [
			{
				symbol: 'C',
				names: ['c', 'celsius', 'centigrade', 'centigrades'],
				multiplier: 1
			}
		]
	},
	kalvin: {
		convert: sum => prefixUnit([imperialUnits.fahrenheit.units[0]], (sum * (9 / 5)) - 459.67),
		units: [
			{
				symbol: 'K',
				names: ['kelvin', 'kelvins', 'k'],
				multiplier: 1
			}
		]
	},
	volume: {
		convert: sum => simpleConvert(sum, 1 / fluidOunces, imperialUnits.volume, ['gal', 'fl oz']),
		units: [
			{
				symbol: 'ml',
				names: ['milliliter', 'milliliters', 'millilitre', 'millilitres', 'ML'],
				multiplier: 0.001
			},
			{
				symbol: 'cl',
				names: ['centiliter', 'centiliters', 'centilitre', 'centilitres'],
				multiplier: 0.01
			},
			{
				symbol: 'dl',
				names: ['deciliter', 'deciliters', 'decilitre', 'decilitres'],
				multiplier: 0.1
			},
			{
				symbol: 'l',
				names: ['liter', 'liters', 'litre', 'litres', 'L'],
				multiplier: 1
			},
			{
				symbol: 'dal',
				names: ['decaliter', 'decaliters', 'decalitre', 'decalitres'],
				multiplier: 10
			},
			{
				symbol: 'hl',
				names: ['hectoliter', 'hectoliters', 'hectomatre', 'hectolitres'],
				multiplier: 100
			},
			{
				symbol: 'kl',
				names: ['kiloliter', 'kiloliters', 'kilolitre', 'kilolitres'],
				multiplier: 1000
			}
		]
	},
	weight: {
		convert: sum => simpleConvert(sum, 1 / pound, imperialUnits.weight, ['oz', 'lbs', 't']),
		units: [
			{
				symbol: 'mg',
				names: ['milligram', 'milligrams', 'milligramme', 'milligrammes'],
				multiplier: 0.001
			},
			{
				symbol: 'cg',
				names: ['centigram', 'centigrams', 'centigramme', 'centigrammes'],
				multiplier: 0.01
			},
			{
				symbol: 'dg',
				names: ['decigram', 'decigrams', 'decigramme', 'decigrammes'],
				multiplier: 0.1
			},
			{
				symbol: 'g',
				names: ['gram', 'grams', 'gramme', 'grammes'],
				multiplier: 1
			},
			{
				symbol: 'dag',
				names: ['decagram', 'decagrams', 'decagramme', 'decagrammes'],
				multiplier: 10
			},
			{
				symbol: 'hg',
				names: ['hectogram', 'hectograms', 'hectomatre', 'hectogrammes'],
				multiplier: 100
			},
			{
				symbol: 'kg',
				names: ['kilogram', 'kilograms', 'kilogramme', 'kilogrammes'],
				multiplier: 1000
			},
			// Ofiiclaly it's 'megagram'. However, ton/tonne is also used and since both imperial and metric use it,
			// 'Ton' will be imperial and 'Tonne' will be metric
			{
				symbol: 'Mg',
				names: [
					'metric ton', 'metric tons', 'megagram', 'megagrams', 'megagramme', 'megagrammes', 'tonne', 'tonnes', 'metric tonne', 'metric tonnes'
				],
				multiplier: 1000000
			}
		]
	},
	lengths: {
		convert: sum => {
			const inches = sum / inch;
			const displayedUnits = imperialUnits.lengths.units.filter(unit =>
				['ml', 'ft', 'in'].includes(unit.symbol)
			);

			// A special case to use the feet'inches" format when the number is
			// between 1 and 15 feet
			if (inches >= 12 && inches <= 180) {
				const rounded = Math.round(inches);
				return `${Math.floor(rounded / 12)}'${rounded % 12}"`;
			}

			return prefixUnit(displayedUnits, inches);
		},
		units: [
			{
				symbol: 'mm',
				names: ['millimeter', 'millimeters', 'millimetre', 'millimetres'],
				multiplier: 0.001
			},
			{
				symbol: 'cm',
				names: ['centimeter', 'centimeters', 'centimetre', 'centimetres'],
				multiplier: 0.01
			},
			{
				symbol: 'dm',
				names: ['decimeter', 'decimeters', 'decimetre', 'decimetres'],
				multiplier: 0.1
			},
			{
				symbol: 'm',
				names: ['meter', 'meters', 'metre', 'metres'],
				multiplier: 1
			},
			{
				symbol: 'dam',
				names: ['decameter', 'decameters', 'decametre', 'decametres'],
				multiplier: 10
			},
			{
				symbol: 'hm',
				names: ['hectometer', 'hectometers', 'hectomatre', 'hectometres'],
				multiplier: 100
			},
			{
				symbol: 'km',
				names: ['kilometer', 'kilometers', 'kilometre', 'kilometres'],
				multiplier: 1000
			}
		]
	}
};

/**
 * Deals with the conversion if it's simple enough.
 * @param {number} sum The sum that is calculated in exec.
 * @param {number} multiplier The number that should be multiplied to get the new unit.
 * @param {Object} baseUnit A base unit object that contains all units. Example: metricUnits.weight.
 * @param {Array} specialUnits An array containing what kind of units should be shown as a result. This should contain non obscure units.
 *
 * @returns {number} A user-friendly representation of the value
 */
function simpleConvert(sum, multiplier, baseUnit, specialUnits) {
	const result = sum * multiplier;
	const displayedUnits = baseUnit.units.filter(unit => specialUnits.includes(unit.symbol));

	return prefixUnit(displayedUnits, result);
}

/**
 * Convert a user-friendly name of a unit to the unit's symbol, eg.
 * "meters" -> "m", "meter" -> "m", "m" -> "m"
 * @param {Array<LengthUnit>} units An array of units to look up
 * @param {string} unitName A string to be matched
 * @returns {?string} The unit's symbol or null
 */
function getUnitSymbol(units, unitName) {
	const matchingUnit = units.find(
		unit => unit.symbol === unitName || unit.names.includes(unitName)
	);

	return matchingUnit ? matchingUnit.symbol : null;
}

/**
 * Execute a regular expression and return all matching values (a RegExp with
 * the global flag can match multiple values in a single string)
 * @param {RegExp} regexp A RegExp to match the string against
 * @param {string} text A string to be matched
 * @returns {Array} An array containing all results of RegExp#exec
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
 * @param {Array<Array<LengthUnit>>} baseUnits All supported unit systems
 * @returns {Array<Array<number, string>>} An array of recognized units and values
 */
function parseUnits(text, baseUnits) {
	const allUnits = baseUnits.reduce((collectedUnits, baseUnit) => [...collectedUnits, ...baseUnit.units], []);
	const parts = getAllMatches(/(-?[\d,.]+)(?:\s?([^\d]+))?/g, text)
		.map(match => match.slice(1, 3))
		.map(part => ({
			value: parseFloat(
				/^[\d]+,[\d]+$/.test(part[0]) ?
					part[0].replace(',', '.') :
					part[0].replace(/,/g, ''),
				10
			),
			symbol: getUnitSymbol(allUnits, part[1])
		}));

	return parts;
}

/**
 * Convert a number in a base unit to a user-friendly (approximated) form,
 * eg. 20000 m -> 20 kilometers
 * @param {Array<LengthUnit>} units An array with possible units
 * @param {number} value The value in the base unit
 * @returns {string} A user-friendly representation of the value
 */
function prefixUnit(units, value) {
	const unit = units.reduce(
		(chosenUnit, currentUnit) =>
			currentUnit.multiplier <= Math.abs(value) ? currentUnit : chosenUnit
	);
	const length = value / unit.multiplier;

	return `${Math.round(length * 100) / 100} ${unit.names[1]}`;
}

function exec(message, args) {
	const unitSystems = [...Object.values(imperialUnits), ...Object.values(metricUnits)];
	const input = parseUnits(args.convert, unitSystems);
	const baseUnit = unitSystems.find(({units}) => {
		return input.every(part => units.some(unit => unit.symbol === part.symbol));
	});

	if (input.length === 0 || !baseUnit) {
		// User's input is incomprehensible, give up
		return message.reply(
			'There was an error processing your measurements.\n' +
			'Maybe you typed something like `5\'4` or `1m50`, these ' +
			'notations aren\'t supported, use `5\'4"` and `1.5m` instead.'
		);
	}

	// The unit is inches for imperial and meters for metric
	const sum = input
		.map(part => {
			const unit = baseUnit.units.find(unit => unit.symbol === part.symbol);
			return part.value * unit.multiplier;
		})
		.reduce((sum, number) => sum + number);

	const output = baseUnit.convert(sum);

	return message.reply(`That would be ${output}!`);
}

module.exports = new Command('convert', exec, options);

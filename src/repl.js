module.exports = client => {
	const repl = require('repl');
	const {Transform} = require('stream');
	const {Console} = require('console');

	const replserver = repl.start({
		prompt: '> ',
		useGlobal: true
	});

	replserver.context.client = client;
	replserver.context.replserver = replserver;

	replserver.on('exit', () => {
		client.shard.send('exit');
	});

	class REPLStream extends Transform {
		_transform(chunk, encoding, callback) {
			const str = '\r\x1b[K' + chunk;
			callback(null, str);
			replserver.displayPrompt(true);
		}
	}

	const stream = new REPLStream();

	const console = new Console(stream);

	Object.defineProperty(global, 'console', {
		get() {
			return console;
		},
		enumerable: true,
		configurable: true
	});

	stream.pipe(process.stdout);
};

const suppressPrompt = (replServer, defaultEval) => (...args) => {
	const prompt = replServer._prompt;
	replServer.setPrompt('');
	defaultEval(...args);
	replServer.setPrompt(prompt);
	replServer.displayPrompt(true);
};

module.exports = client => {
	const repl = require('repl');
	const {Transform} = require('stream');
	const {Console} = require('console');

	const replserver = repl.start({
		prompt: '> ',
		useGlobal: true
	});

	replserver.eval = suppressPrompt(replserver, replserver.eval);
	replserver.context.client = client;
	replserver.context.replserver = replserver;

	replserver.on('exit', () => {
		client.shard.send('exit');
	});

	class REPLStream extends Transform {
		_transform(chunk, encoding, callback) {
			const str = '\r\u001B[K' + chunk;
			callback(null, str);
			replserver.displayPrompt(true);
		}
	}

	const stream = new REPLStream();

	const console = new Console(stream);

	Reflect.defineProperty(global, 'console', {
		get() {
			return console;
		},
		enumerable: true,
		configurable: true
	});

	stream.pipe(process.stdout);
};

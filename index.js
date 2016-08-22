var restify = require('restify');
fs = require =('fs');

var server = restify.createServer({
	certificate: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.crt'),
	key: fs.readFileSync('/home/stanley/bot.ncufood.info/ca.key'),
});
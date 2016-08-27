var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var _ = require('underscore');

const firstEntityValue = (entities, entity) => {
	const val = entities && entities[entity] &&
	Array.isArray(entities[entity]) &&
	entities[entity].length > 0 &&
	entities[entity][0].value;
	if (!val) {
		return null;
	}
	return typeof val === 'object' ? val.value : val;
};

exports.sendGreetings = function({context, entities}) {
	console.log("greetings");
	return new Promise(function(resolve, reject) {
		var results = [
				"您好，我不叫Siri，很高興為您服務",
				"安安，你好",
				"您好，我是中大美食機器人",
				"您好，請問有什麼可以為您服務的嗎？",
				"請問需要什麼服務嗎？",
				"你好！！很高興為您服務"
			]
        context.greeting = _.sample(results);
		return resolve(context);
    });
}

exports.replyThanks = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		var results = [
			"不客氣～",
			"有禮貌的小孩最乖了",
			"這麼有禮貌，一定可以 All pass",
			"不客氣，我給你87分不能再高了",
			"能夠為您服務是我的榮幸",
			"您太客氣了",
			"不會不會",
			"有禮貌的小孩好棒棒"
		]
		context.gratitude = _.sample(results);
		return resolve(context);
	});
}

exports.replyInsult = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		var results = [
			"你這樣下修央大的水準對嗎？",
			"靠北，我沒跟你收錢就不錯了",
			"中央的校訓不是誠樸嗎？這樣罵髒話對嗎？",
			"實在是很抱歉，如果有招待不周可以好好說嘛？",
			"阿呦，不要因為騎不到小綠就罵髒話啊",
			"真的很抱歉，我才剛出生不久，智商有點低，招待不周",
			"央大素質不意外"
		]
		context.reply = _.sample(results);
		return resolve(context);
	});
}
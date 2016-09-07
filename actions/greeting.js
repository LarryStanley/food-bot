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
			"中央的校訓不是誠樸嗎？這樣罵髒話對嗎？幹",
			"實在是很抱歉，如果有招待不周可以好好說嘛？",
			"阿呦，你髒話系？",
			"你被騙繳系學會費嗎？",
			"你該不會繳了系學會費了吧？我當初繳了兩千",
			"真的很抱歉，我才剛出生不久，智商有點低，招待不周",
			"央大素質不意外"
		]
		context.replyInsult = _.sample(results);
		return resolve(context);
	});
}

exports.replyAuthor = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		context.elements = [];
		context.elements.push({
			"subtitle": "如果你想要參考我的原始碼，可以點選「原始碼」。\n 有任何問題，可以點選「聯絡作者」，或是來信到 larrystanley@me.com，謝謝。",
			"title": "我認為作者是個帥哥，所以我都稱他為帥哥。",
			/*"image_url": "http://graph.facebook.com/100000165905522/picture?type=large",*/
			"buttons": [{
				"type": "web_url",
				"url": "https://github.com/LarryStanley/food-bot",
				"title": "原始碼"
			},
			{
				"type": "web_url",
				"url": "https://www.facebook.com/Ly.Stanley",
				"title": "聯絡作者"
			}]
		});
		context.generics = true;
		context.result = "作者是個帥哥";
		return resolve(context);
	});
}

exports.replyGender = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		var results = [
			"你在這邊問我性別，肯定還沒脫魯",
			"先別管我的性別了，你托魯了嗎？",
			"我應該是男的",
			"男，170，中壢，安安給虧嗎？"
		]
		context.result = _.sample(results);
		return resolve(context);
	});
}

exports.replyFunction = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		
		context.result = "你可以問我：\n今天天氣如何？\n132多久會到警衛室呢？\n請問有小紅牛的菜單嗎？\n立橙的評價如何？";
		return resolve(context);
	});
}

exports.getStory = function({context, entites}) {
	return new Promise(function(resolve, reject) {
		const currentDate = moment().format("YYYY-MM-DD");
		const twoWeeksDate = moment(moment().subtract(1.5, 'weeks')).format("YYYY-MM-DD");
		const url = "https://graph.facebook.com/1514597625469099/posts?fields=actions,from,message,comments.limit(5).summary(true),likes.limit(0).summary(true)&since=" + twoWeeksDate + "&until=" + currentDate + "&limit=150&access_token=" + process.env.PAGE_TOKEN;
		rp({
			uri: url,
			json: true
		})
			.then(function(fbResponse) {
				fbResponse = _.sortBy(fbResponse.data, function(post) {
					return post.likes.summary.total_count;
				});
				fbResponse = fbResponse.reverse().slice(0,5);
				const result = _.sample(fbResponse);
				context.generics = true;
				context.elements = [{
					"subtitle": result.message,
					"title": "這是我最近在「靠北中央」看到的文章",
					"buttons": [{
						"type": "web_url",
						"url": "https://www.facebook.com/" + result.id,
						"title": "查看原文"
					}]
				}];
				context.result = "故事";
				return resolve(context);
			});
	});
}
var request = require('request');
var restify = require('restify');
var crypto = require('crypto');
var fetch = require('node-fetch');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var _ = require('underscore');

fs = require('fs');

require('dotenv').config();

try {
  	Wit = require('../').Wit;
	interactive = require('../').interactive;
} catch (e) {
	Wit = require('node-wit').Wit;
	interactive = require('node-wit').interactive;
}

var token = process.env.PAGE_TOKEN;
var server = restify.createServer({
	certificate: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.crt'),
	key: fs.readFileSync('/home/stanley/bot.ncufood.info/ca.key'),
	ca: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.ca-bundle'),
	cert: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.crt'),
	name: "food-bot",
	passphrase: process.env.PASSPHARSE
});
var generic = false;
var generics = false;
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/', function create(req, res, next) {
	res.send(201, Math.random().toString(36).substr(3, 8));
	return next();
});

server.get('/webhook/', function(req, res) {
	console.log(req.query);
	if (req.query.hub.verify_token === process.env.VERIFY_TOKEN) {
		res.send(200, parseInt(req.query.hub.challenge));
	} else 
		res.send('Error, wrong validation token');

	return next();
});

server.post('/webhook/', function (req, res) {
	messaging_events = req.body.entry[0].messaging;
	for (i = 0; i < messaging_events.length; i++) {
		event = req.body.entry[0].messaging[i];
		sender = event.sender.id;
		var sessionId = findOrCreateSession(sender);
		if (event.message && event.message.text) {
			text = event.message.text;
			wit.runActions(
				sessionId, // the user's current session
				text, // the user's message
				sessions[sessionId].context // the user's current session state
			).then((context) => {
				sessions[sessionId].context = context;
			}).catch((err) => {
				console.error('Oops! Got an error from Wit: ', err.stack || err);
			})
		}
	}
	res.send(200, "success");
});

const sessions = {};
const findOrCreateSession = (fbid) => {
	let sessionId;
	Object.keys(sessions).forEach(k => {
		if (sessions[k].fbid === fbid) {
			sessionId = k;
		}	
	});
	if (!sessionId) {
		sessionId = new Date().toISOString();
		sessions[sessionId] = {fbid: fbid, context: {}};
	}
	return sessionId;
};

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

const actions = {
	send(request, response) {

		const {sessionId, context, entities} = request;
		const {text, quickreplies} = response;
		const recipientId = sessions[sessionId].fbid;
		if (recipientId) {
			if (generic) {
				return sendGenericMessage(recipientId, context.url, context.title, context.subtitle)
				.then(() => {
					generic = false;
				})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			} else if(generics) {
				return sendMultiGenericMessage(recipientId, context.elements)
				.then(() => {
					generics = false;
				})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			} else {
				return sendTextMessage(recipientId, text)
				.then(() => {
					return Promise.resolve();
				})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			}
		} else {
			console.error('Oops! Couldn\'t find user for session:', sessionId);
			return Promise.resolve()
		}
	},sendGreetings({context, entities}) {
		return new Promise(function(resolve, reject) {
				var results = [
						"您好，我不叫Siri，很高興為您服務",
						"安安，你好",
						"您好，我是中大美食機器人",
						"安安，給虧嗎？",
						"您好，請問有什麼可以為您服務的嗎？",
						"請問需要什麼服務嗎？",
						"你好！！很高興為您服務"
					]
		        context.greeting = _.sample(results);
			return resolve(context);
	    });
	},getMenu({context, entities}) {
		return new Promise(function(resolve, reject) {
				var allName = [];
				request('http://www.ncufood.info/api/all_name', function (error, response, body) {
					const entityRestaurantName = firstEntityValue(entities, 'restaurant_name');

					if (entityRestaurantName) {
						var finalName;
						if (!error && response.statusCode == 200) {
							_.each(JSON.parse(body), function(value) {
								if (stringSimilarity.compareTwoStrings(value, entityRestaurantName) > 0.5) {
									finalName = value;
									return false;
								}
							});

							if (finalName) {
								context.restaurant_name = finalName;
						        context.restaurant_url = "http://www.ncufood.info/" + finalName;
								context.restaurant_url = encodeURI(context.restaurant_url);
								context.title = finalName;
						        context.url = "http://www.ncufood.info/" + finalName;
								context.url = encodeURI(context.url);

								request(encodeURI("http://www.ncufood.info/api/" + finalName), function(error, response, body) {
									context.subtitle = JSON.parse(body).address;
								});
								generic = true;
								delete context.missingRestaurantName;
								return resolve(context);
							} else {
								context.missingRestaurantName = true;
								delete context.restaurant_url;
								return resolve(context);
							}
						}
					} else {
						context.missingRestaurantName = true;
						delete context.restaurant_url;
						return resolve(context);
					}
				});
	    });
	},getWeather({context, entities}) {
		return new Promise(function(resolve, reject) {
			request('http://api.openweathermap.org/data/2.5/weather?lat=24.968129&lon=121.192645&units=metric&APPID=' + process.env.WEATHER_KEY, function(error, response, body) {
				var result = JSON.parse(body);
				context.temperature =  "\n" + result.main.temp + " 度";
				return resolve(context);
			});
	    });
	}, getBusTime({context, entities}) {
		return new Promise(function(resolve, reject) {
			const entitiesBusStop = firstEntityValue(entities, 'bus_stop');
			const entitiesBusRoute = firstEntityValue(entities, 'bus_route');
			if (entitiesBusRoute)
				context.bus_route = entitiesBusRoute;
			if (entitiesBusStop)
				context.bus_stop = entitiesBusStop;

			if (!context.bus_stop) {
				context.missingStop = true;
				delete context.bus_time;
				return resolve(context);
			} else if(!context.bus_route) {
				context.missingRoute = true;
				delete context.bus_time;
				return resolve(context);
			} 



			if (context.bus_stop && context.bus_route){
				const busList = ["133", "132", "172", "132_A"];
				const busIdList = {
					"133": "133",
					"132": "3220",
					"172": "3221",
					"3222": "132_A"
				};
				var routeSimilarity = stringSimilarity.findBestMatch(context.bus_route, busList);
				var url = "https://api.cc.ncu.edu.tw/bus/v1/routes/" + busIdList[stringSimilarity.findBestMatch(context.bus_route, busList).bestMatch.target] + "/estimate_times";
				request({
					headers: {
						"X-NCU-API-TOKEN": process.env.NCU_API_TOKEN
					},
					url: url}, function(error, response, body) {
					const allBusStop = _.pluck(JSON.parse(body).BusDynInfo.BusInfo.Route.EstimateTime, "StopName");
					var stopSimilarity = stringSimilarity.findBestMatch(context.bus_stop, allBusStop);
					const estimateTimeResult = _.find(JSON.parse(body).BusDynInfo.BusInfo.Route.EstimateTime, function(stop) {
						return stop.StopName === stopSimilarity.bestMatch.target;
					});
					const currentTime = moment();
					const busComeTime = moment(moment().format('MMMM Do YYYY, ' + estimateTimeResult.comeTime + ':00'), 'MMMM Do YYYY, hh:mm:ss');
					subtractTime = busComeTime.diff(currentTime, 'minutes', true);
					context.bus_time = subtractTime.toFixed(0) + "分鐘";

					delete context.missingRoute;
					delete context.missingStop;
					return resolve(context);
				});
			}
	    });
	},replyThanks({context, entities}) {
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
	},getRestaurantRate({context, entities}) {
		return new Promise(function(resolve, reject) {
				var allName = [];
				request('http://www.ncufood.info/api/all_name', function (error, response, body) {
					const entityRestaurantName = firstEntityValue(entities, 'restaurant_name');
					if (entityRestaurantName) {
						var finalName;
						if (!error && response.statusCode == 200) {
							_.each(JSON.parse(body), function(value) {
								if (stringSimilarity.compareTwoStrings(value, entityRestaurantName) > 0) {
									finalName = value;
									return false;
								}
							});

							if (finalName) {
								context.restaurant_name = finalName;
						        context.restaurant_url = "http://www.ncufood.info/" + finalName;
								context.restaurant_url = encodeURI(context.restaurant_url);
								request(encodeURI("http://www.ncufood.info/api/" + finalName), function(error, response, body) {
									var result = JSON.parse(body)[0];
									context.like_count = result.likes.like_count;
									context.dislike_count = result.likes.dislike_count;

									generics = true;
									context.elements = [];
									if (result.comments) {
										_.each(result.comments.reverse(), function(comment) {
											context.elements.push({
												"subtitle": comment.comment,
												"title": comment.user.name,
												"buttons": [{
													"type": "web_url",
													"url": context.restaurant_url,
													"title": "查看更多"
												}]
											});
										});
									} else {
										context.noRate = true;
										generics = false;
										delete context.elements;
									}
								});
								delete context.missingRestaurantName;
								return resolve(context);
							} else {
								context.missingRestaurantName = true;
								delete context.restaurant_url;
								return resolve(context);
							}
						}
					} else {
						context.missingRestaurantName = true;
						delete context.restaurant_url;
						return resolve(context);
					}
				});
	    });
	}, getFoodType({context, entities}) {
		return new Promise(function(resolve, reject) {
			const foodType = ["飲料/點心", "宵夜", "早餐", "午晚餐"];
			const foodList = {
				"飲料/點心": "drink",
				"宵夜":"midnight-snack", 
				"早餐":"breakfast", 
				"午晚餐": "dine"
			};
			const entityType = firstEntityValue(entities, "food_type");
			typeSimilarity = stringSimilarity.findBestMatch(entityType, foodType);
			if (typeSimilarity.bestMatch.rating) {
				generics = true;
				const url = "http://www.ncufood.info/api/" + foodList[typeSimilarity.bestMatch.target];
				rp({
					uri: url,
					json:true
				}).then(function(response) {
					context.elements = [];
					_.each(response, function(value, key) {
						var restaurant_url = "http://www.ncufood.info/" + value.name;
						restaurant_url = encodeURI(restaurant_url);
						context.elements.push({
							"subtitle": value.address,
							"title": value.name,
							"image_url": "http://www.ncufood.info/image/indexMetaImageNew.png",
							"buttons": [{
								"type": "web_url",
								"url": restaurant_url,
								"title": "查看更多"
							}]
						});
					});

					context.elements = context.elements.slice(0, 4);
					context.elements.push({
						"title": typeSimilarity.bestMatch.target,
						"image_url": "http://www.ncufood.info/image/indexMetaImageNew.png",
						"buttons": [{
							"type": "web_url",
							"url": "http://www.ncufood.info/" +  foodList[typeSimilarity.bestMatch.target],
							"title": "查看更多" +  typeSimilarity.bestMatch.target + "的結果",
						}]
					});
					context.result = true;
					delete context.noResult;
					return resolve(context);
				});
			} else {
				context.noResult = true;
				delete context.result;
				return resolve(context);
			}
	    });
	},
};

const wit = new Wit({
	accessToken: process.env.WIT_TOKEN,
	actions,
});

function sendTextMessage(id, text) {
	id = id.toString();
	const body = JSON.stringify({
		recipient: { id },
		message: { text },
	});
	const qs = 'access_token=' + encodeURIComponent(token);
	return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body,
	})
	.then(rsp => rsp.json())
	.then(json => {
		if (json.error && json.error.message) {
			throw new Error(json.error.message);
		}
		return json;
	});
};


function sendGenericMessage(id, url, title, subtitle) {
	id = id.toString();
	const body = JSON.stringify({
		recipient: { id },
		message: {
			"attachment": {
				"type": "template",
				"payload": {
					"template_type": "generic",
					"elements": [{
						"title": title,
						"subtitle": subtitle,
						"image_url": "http://www.ncufood.info/image/indexMetaImageNew.png",
						"buttons": [{
							"type": "web_url",
							"url": url,
							"title": "查看更多"
						}]
					}]
				}
			}
		},
	});
	const qs = 'access_token=' + encodeURIComponent(token);
	return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body,
	})
	.then(rsp => rsp.json())
	.then(json => {
		if (json.error && json.error.message) {
			throw new Error(json.error.message);
		}
		return json;
	});
};

function sendMultiGenericMessage(id, elements) {
	id = id.toString();
	const body = JSON.stringify({
		recipient: { id },
		message: {
			"attachment": {
				"type": "template",
				"payload": {
					"template_type": "generic",
					"elements": elements
				}
			}
		},
	});
	const qs = 'access_token=' + encodeURIComponent(token);
	return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body,
	})
	.then(rsp => rsp.json())
	.then(json => {
		if (json.error && json.error.message) {
			throw new Error(json.error.message);
		}
		return json;
	});
};


server.listen(443);
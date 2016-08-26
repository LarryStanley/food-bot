'use strict';

var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var ical = require('ical');
var Promise = require('promise');
var _ = require('underscore');
var Q = require('q');

var generic = false;
var generics = false;

var fbMessage = require('../fb-connect.js');
var weather = require('./weather.js');
const sessions = require('../sessions.js').sessions;

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

exports.actions = {
	send(request, response) {

		const {sessionId, context, entities} = request;
		const {text, quickreplies} = response;
		const recipientId = sessions[sessionId].fbid;
		if (recipientId) {
			if (generic) {
				return fbMessage.sendGenericMessage(recipientId, context.url, context.title, context.subtitle)
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
				return fbMessage.sendMultiGenericMessage(recipientId, context.elements)
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
				return fbMessage.sendTextMessage(recipientId, text)
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
				context.temperature = "\n攝氏" + result.main.temp ;
				/*generics = true;
				context.elements = [];
				context.elements.push({
					"subtitle": result.main.temp + "\n" + result.weather[0].main,
					"title": "中央天氣",
					"image_url": "http://c8.staticflickr.com/2/1601/24973800335_4a8f7bdcbd_k.jpg"
				});*/

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
					var subtractTime = busComeTime.diff(currentTime, 'minutes', true);
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
	},getCalendar({context, entities}) {
		return new Promise(function(resolve, reject) {
			ical.fromURL('https://calendar.google.com/calendar/ical/ncu.acad@gmail.com/public/basic.ics', {}, function(err, data) {
				var entityEventName = firstEntityValue(entities, 'cal_event');
				return new Promise(function(resolve, reject) {
					var result = [];
					_.each(data, function(value, key) {
						const similarity = stringSimilarity.compareTwoStrings(value.summary, firstEntityValue(entities, 'cal_event'));
						const timeDiff = moment(value.start).diff(moment());
						if (similarity > 0.5 && timeDiff > 0) {
							value.similarity = {
								time: timeDiff,
								text: stringSimilarity.compareTwoStrings(value.summary, firstEntityValue(entities, 'cal_event'))
							};
							result.push(value);
						}
					});
					return resolve(result);
				}).then(function(result) {
					if (result.length) {
						result = _.min(result, function(value) {
							return value.similarity.time;
						});

						console.log(result);

						moment.locale('zh-tw');
						if (result.end && moment(result.start).format != moment(result.end))
							context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll') + " 到 " + moment(result.end).format('ll');
						else
							context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll');
					} else {
						context.notFound = true;
					}

				}).then(function() {
					return resolve(context);
				});
			});
		});
	}
};
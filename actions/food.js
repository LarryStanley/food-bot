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

exports.getMenu = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		var allName = [];
		request('http://www.ncufood.info/api/all_name', function (error, response, body) {
			const entityRestaurantName = firstEntityValue(entities, 'restaurant_name');
			console.log(entityRestaurantName);
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
						context.generic = true;
						context.restaurant_name = finalName;
				        context.restaurant_url = "http://www.ncufood.info/" + finalName;
						context.restaurant_url = encodeURI(context.restaurant_url);
						context.title = finalName;
				        context.url = "http://www.ncufood.info/" + finalName;
						context.url = encodeURI(context.url);

						request(encodeURI("http://www.ncufood.info/api/" + finalName), function(error, response, body) {
							context.subtitle = JSON.parse(body).address;
							delete context.missingRestaurantName;
							return resolve(context);
						});
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
}

exports.getRandomFood = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		const hour = moment().format('H')
		var foodType = "midnight-snack";
		var foodTypeChinese = "晚餐";
		if (hour >= 16 && hour < 20){
			foodType = "dine";
			foodTypeChinese = "晚餐";
		}
		else if (hour < 11){
			foodType = "breakfast";
			foodTypeChinese = "早餐";
		}
		else if (hour >= 20){
			foodType = "midnight-snack";
			foodTypeChinese = "宵夜"
		}else{
			foodType = "dine";
			foodTypeChinese = "午餐"
		}

		context.generics = true;
		const url = "http://www.ncufood.info/api/" + foodType;
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

			context.elements = _.sample(context.elements, 6);
			context.elements.push({
				"title": foodTypeChinese,
				"image_url": "http://www.ncufood.info/image/indexMetaImageNew.png",
				"buttons": [{
					"type": "web_url",
					"url": "http://www.ncufood.info/" +  foodType,
					"title": "查看更多" +  foodTypeChinese + "的結果",
				}]
			});
			context.randomFood = true;
			delete context.noResult;
			return resolve(context);
		});
	});
}

exports.getRestaurantRate = function({context, entities}) {
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

							context.generics = true;
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
}

exports.getFoodType = function({context, entities}) {
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
			context.generics = true;
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

				context.elements = _.sample(context.elements, 8);
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
}
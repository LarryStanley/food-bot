'use strict';

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

exports.weather = {
	getWeather({context, entities}) {
		return new Promise(function(resolve, reject) {
			request('http://api.openweathermap.org/data/2.5/weather?lat=24.968129&lon=121.192645&units=metric&APPID=' + process.env.WEATHER_KEY, function(error, response, body) {
				var result = JSON.parse(body);
				if (context.temperature)
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
	},
}
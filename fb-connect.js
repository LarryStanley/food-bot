var request = require('request');
var fetch = require('node-fetch');
var rp = require('request-promise');

require('dotenv').config();
const token = process.env.PAGE_TOKEN;

module.exports = {
	sendTextMessage: function(id, text) {
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
	},
	sendGenericMessage: function(id, url, title, subtitle) {
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
	},
	sendMultiGenericMessage: function(id, elements) {
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
	},

};
// createXHR('POST', 'https://music.163.com/api/login/', {
// 	'username': username,
// 	'password': hashlib.md5(password).hexdigest(),
// 	'rememberLogin': 'true'
// }).then(function (response) {	// handle the response
// 
// });
(function () {
	if (!this.XMLHttpRequest) {
		return;
	}

	function encodeParams(params) {
		var res = [];
		for (key in params) {
			if (params.hasOwnProperty(key)) {
				res.push(key + '=' + params[key]);
			}
		}
		return res.join('&');
	}

	function createXHR(method, url, params) {
		var defer = q.defer(),
		 	xhr = new XMLHttpRequest();

		xhr.open(method, url + '?' + encodeParams(params), true);
		if (method === 'GET') {
			xhr.send(null);
		} else if (method === 'POST') {
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.send(encodeParams(params));
		}

		xhr.onstatechange = function () {
			if (xhr.readyState !== 4) {
				return;
			}
			if (xhr.status === 200 || xhr.status === 304) {
				defer.resolve(xhr.responseText);
			}	
		}

		return defer.promise;
	}

	exports.createXHR = createXHR;
})();
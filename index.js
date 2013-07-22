/* Copyright 2010-2013 Ryan Gerard
 * Remixed 2013 by Timo Derstappen
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var config = require('./config'),
    url = require('url'),
    request = require('request'),
    _ = require('underscore'),
    api_schema = require('./api_schema');

function get(url, callback) {
  request(url, function (error, response, body) {
    if (response.statusCode == 200) {
      callback(error, JSON.parse(body));
    } else {
      callback(error, body);
    }
  });
}

function post(url, body, callback) {
  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded'},
    url:     url,
    body:    body
  }, function(error, response, body) {

    if (response.statusCode == 200) {
      callback(error, JSON.parse(body));
    } else {
      callback(error, body);
    }
  });
}

function hasRequiredParams(params, route) {
  var fulfilled = true;

  if (route.required) {
    _.each(route.required, function(required_param) {
      if (!params || !params.hasOwnProperty(required_param)) {
        fulfilled = false;
      }
    });
  }

  return fulfilled;
}

function isAuthenticated(params, route) {
  var authenticated = true;

  if (route.auth) {
    if (!config.hasOwnProperty('access_token') || config.access_token === null || config.access_token === '') {
      authenticated = false;
    } else {
      params.access_token = config.access_token;
    }
  }
  return authenticated;
}

function createUrl(path, params) {
  if (path.match(/\/api/)) {
    host = "angel.co";
  } else {
    host = "api.angel.co";
  }

  return url.format({
    protocol: "https",
    host: host,
    pathname: path,
    query: params
  });
}

var api = {
  init: function(clientID, secret) {
    config.clientID = clientID;
    config.secret = secret;
  },
  setAccessToken: function(token) {
    config.access_token = token;
  },
  getAuthUrl: function() {
    return createUrl('/api/oauth/authorize', {
      client_id: config.clientID,
      scope: 'email',
      response_type: 'code'
    });
  },
  requestAccessToken: function(code, callback) {
    return createPostRequest(createUrl('/api/oauth/token', {
      client_id: config.clientID,
      client_secret: config.secret,
      code: code,
      grant_type: 'authorization_code'
    }), "", callback);
  }
};

_.each(api_schema, function(routes, method) {
  _.each(routes, function(route) {
    api[method + route.name] = function(params, callback) {
      // get parameter dynamically and validate
      if (!hasRequiredParams(params, route)) {
        return callback({error: 'Required parameters: ' + route.required}, null);
      }
      if (!isAuthenticated(params, route)) {
        return callback({error:'No access token. Url: ' + api.getAuthUrl()}, null);
      }

      // placeholder


      switch(method) {
        case "get":
          get(createUrl('/1' + route.path, params), callback);
          break;
        case "post":
          post(createUrl('/1' + route.path), params, callback);
          break;
        case "delete":
          delete(createUrl('/1' + route.path, params), callback);
          break;
      }

    };
  });
});

module.exports = api;


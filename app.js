var express = require('express');
//var server = require('http').Server(app);
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require("request");

var routes = require('./routes/index');
var users = require('./routes/users');

var app = require("express")();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8000);

var nyt = require('newyorktimes')({ times_newswire: '20f4728f3b2f42c597ddc3030a24fd00' });

var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyCjHKGczt8QjINcTVQ4iZGXsSsYBESXipo'
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

app.locals.dataset = [
  [],
  []
];

io.on('connection', function (socket) {

  console.log("connected");

  nyt.query('https://api.nytimes.com/svc/news/v3/content/all/all.json', function (err, json) {

    var nytData = [];

    json = JSON.parse(json["body"]);
    for (var i = json['results'].length - 1; i >= 0; i--) {
      if(json['results'][i]["geo_facet"]) {
        console.log(json['results'][i]["geo_facet"][0]);
        googleMapsClient.geocode({
          address: json['results'][i]["geo_facet"][0]
        }, function(err, response) {
          if (!err) {
            nytData.push(response.json.results[0].geometry.location['lat']);
            nytData.push(response.json.results[0].geometry.location['lng']);
            nytData.push(1);
          }
        });
      }

    };

    io.emit('nyt', { data: JSON.stringify(nytData)} );
    console.log("sent nyt", nytData);

  });

  request.get({
    url: 'http://www.buzzfeed.com/api/v2/feeds/news',
  }, function(err, response, body) {

    var buzzData = [];

    body = JSON.parse(body);
    
    for (var i = body['big_stories'].length - 1; i >= 0; i--) {
      if(body['big_stories'][i]['content_items'])
        for (var j = body['big_stories'][i]['content_items'].length - 1; j >= 0; j--) {
          if(body['big_stories'][i]['content_items'][j]['datelines'].length > 0){
            //console.log(body['big_stories'][i]['content_items'][j]['datelines'][0]['marker_lng']);
            buzzData.push(parseFloat(body['big_stories'][i]['content_items'][j]['datelines'][0]['marker_lat']));
            buzzData.push(parseFloat(body['big_stories'][i]['content_items'][j]['datelines'][0]['marker_lng']));
            buzzData.push(25);
          }
        };
    };
    for (var i = body['buzzes'].length - 1; i >= 0; i--) {
      if(body['buzzes'][i]['datelines'].length > 0){
        //console.log(body['buzzes'][i]['datelines'][0]['marker_lat']);
        buzzData.push(parseFloat(body['buzzes'][i]['datelines'][0]['marker_lat']));
        buzzData.push(parseFloat(body['buzzes'][i]['datelines'][0]['marker_lng']));
        buzzData.push(25);
      }
    };

    io.emit('buzz', { data: JSON.stringify(buzzData)} );
    console.log("sent buzz", buzzData);

  });


  socket.on('disconnect', function () {
    io.emit('user disconnected');
  });
});




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

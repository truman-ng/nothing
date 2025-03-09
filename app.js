// server.js
const path = require("path");
const dotenv = require("dotenv");

// 如果没有设置 NODE_ENV，就默认为 "development"
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "dev";
}

// 根据 NODE_ENV 拼出要加载的文件名
const envFile = `.env.${process.env.NODE_ENV}`;
dotenv.config({ path: path.resolve(__dirname, envFile) });

console.log("Loaded ENV file:", envFile, "NODE_ENV:", process.env.NODE_ENV);

var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var lotteryRouter = require('./routes/lotteryRoutes');


var app = express();
require("./cron/cronJobs");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/user', usersRouter);
app.use('/lottery', lotteryRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

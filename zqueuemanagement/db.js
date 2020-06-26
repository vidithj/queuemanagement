var mysql = require('mysql');

var connection = mysql.createConnection({
  host: 'ec2-54-173-78-124.compute-1.amazonaws.com',
port : '3306',
  user: 'vjohri',
  password: 'root',
  database: 'qmanagementdb'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log('connected!');
});

module.exports = connection;

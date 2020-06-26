var express = require('express');
var router = express.Router();
var db = require('../db');
var bodyParser = require('body-parser');

router.use(bodyParser.json()); // for parsing application/json
//router.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

/* get method for fetch all products. */
router.get('/qinfo', function(req, res, next) {
  var sql = "SELECT * FROM QManagement";
  db.query(sql, function(err, rows, fields) {
    if (err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    res.json(rows)
  })
});
router.get('/qinfo/:id', function(req, res, next) {
  var id = req.params.id;
console.log(id);
  var sql = `SELECT * FROM QManagement WHERE id =${id}`;
  db.query(sql, function(err, row, fields) {
    if(err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    res.json(row[0])
  })
});
/*post method for create product*/
router.post('/qbook', function(req, res, next) {
  var cust_phone = req.body.customerphone;
  var storeno = req.body.storeno;
  var iscardholder = req.body.iscardholder;
  var currentdatetime = new Date();
  var getCount = `SELECT QNO FROM QManagement`;
 db.query(getCount, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
//console.log(result);
    res.json(result)
  })
  var sql = `INSERT INTO QManagement (CUSTOMERPHONE,STORENO,ISCARDHOLDER, CREATEDDATETIME) VALUES ("${cust_phone}", "${storeno}", "${iscardholder}",NOW())`;
  db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: err })
    }
//console.log(result);
    res.json(result)
  })
})

module.exports = router;

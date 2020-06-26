var express = require('express');
var router = express.Router();
var db = require('../db');
var bodyParser = require('body-parser');

router.use(bodyParser.json()); // for parsing application/json
//router.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

/* get method for fetch all qno. */
router.get('/qinfo', function(req, res, next) {
  var sql = "SELECT * FROM QManagement";
  db.query(sql, function(err, rows, fields) {
    if (err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    res.json(rows)
  })
});

/* get method for fetch particular qno. */
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

/* update method for [articular qno */
router.post('/qupdate', function(req, res, next) {
  //var id = req.params.id;
  var cust_phone = req.body.customerphone;
  var storeno = req.body.storeno; 
  var  inflow = req.body.inflow;
  var outflow = req.body.outflow;
  var sql;
	if(inflow == 1){
  sql = `UPDATE QManagement SET INFLOW=1,CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
  }else if(outflow ==1){
sql = `UPDATE QManagement SET OUTFLOW=1,CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
}
db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    res.json({'status': 'success'})
  })
});
/*post method for create qno*/
router.post('/qbook', function(req, res, next) {
  var cust_phone = req.body.customerphone;
  var cust_name = req.body.customername;
  var storeno = req.body.storeno;
  var iscardholder = req.body.iscardholder;
  var currentdatetime = new Date();
  var getCount = `SELECT * FROM QManagement where CUSTOMERPHONE = ${cust_phone}`;
 db.query(getCount, function(err,row,fields) {
    if(err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
//console.log(result);
   if(row.length == 1){

res.status(400).send('You already have a queue number : '+row[0].QNO)
}else{
var sql = `INSERT INTO QManagement (CUSTOMERNAME,CUSTOMERPHONE,STORENO,ISCARDHOLDER, CREATEDDATETIME) VALUES ("${cust_name}","${cust_phone}", "${storeno}", "${iscardholder}",NOW())`;
  db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: err })
    }
//console.log(result);
    var updatedRow = result.insertId;
  })

}
  })
})

module.exports = router;

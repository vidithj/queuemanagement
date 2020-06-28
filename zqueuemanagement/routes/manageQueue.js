var express = require('express');
var router = express.Router();
var db = require('../db');
const fast2sms = require('fast-two-sms');
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
  sql = `UPDATE QManagement SET INFLOW=1,OUTFLOW=0,CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
  }else if(outflow ==1){
sql = `UPDATE QManagement SET OUTFLOW=1,INFLOW=0,CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
}
db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'inflow/outflow failed!' })
    }
 var getCount = `SELECT * FROM QManagement where INFLOW = 1`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'get count error' })
    }
var currentq = row.length;
var updateCurrentQueue = `UPDATE QManagement SET CURRENTQNO=${currentq} WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
 db.query(updateCurrentQueue, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'update current q error' })
    }
res.send('Inflow/Outflow updated');
})
})
})
});

/*post method for create qno*/
/*post method for create qno*/
var ActivequeueCount;
var oFinalOutput = {
  customername: '',
  customerphone: '',
  storeno: '',
  qno: '',
  waittime: '',
  storename: '',
  brand: '',
 SMSsent : ''
};
router.post('/qbook', function (req, res, next) {
  var getCount = `SELECT * FROM QManagement where INFLOW = 1`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
    ActivequeueCount = row.length;
  })
  next()
}, function (req, res, next) {
  var cust_phone = req.body.customerphone;
  var cust_name = req.body.customername;
  var storeno = req.body.storeno;
  var iscardholder = req.body.iscardholder;
  var currentdatetime = new Date();
  var getCount = `SELECT * FROM QManagement where CUSTOMERPHONE = ${cust_phone} and STORENO=${storeno}`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
    //console.log(result);
    if (row.length == 1) {
      res.status(400).send('You already have a queue number : ' + row[0].QNO)
    } else if (row.length == 0) {
      var sql = `INSERT INTO QManagement (CUSTOMERNAME,CUSTOMERPHONE,STORENO,ISCARDHOLDER, CREATEDDATETIME) VALUES ("${cust_name}","${cust_phone}", "${storeno}", "${iscardholder}",NOW())`;
      db.query(sql, function (err, result) {
        if (err) {
          res.status(500).send({ error: 'Oops we coulnt create a queue for you. Please again!' })
        }
        //console.log(result);
        var updatedRow = result.insertId;
	if(ActivequeueCount>20)
            oFinalOutput.waittime = parseInt(ActivequeueCount/20);
            else
            oFinalOutput.waittime ="0";
        var insertqnoSQL = `UPDATE QManagement SET QNO=${updatedRow},WAITTIME="${oFinalOutput.waittime}",CURRENTQNO=${ActivequeueCount} where id=${updatedRow}`;
        db.query(insertqnoSQL, function (err, rows, fields) {
          if (err) {
            res.status(500).send({ error: 'update qno failed!!' })
          }
          var getupdateDatasql = `SELECT * FROM QManagement where id=${updatedRow}`;
          db.query(getupdateDatasql, function (err, rows, fields) {
            if (err) {
              res.status(500).send({ error: 'insert data retrieval failed!!' })
            }
            oFinalOutput.customername = rows[0].CUSTOMERNAME;
            oFinalOutput.customerphone = rows[0].CUSTOMERPHONE;
            oFinalOutput.storeno = rows[0].STORENO;
            oFinalOutput.qno = rows[0].QNO;
            //oFinalOutput.currentqueue = ActivequeueCount
	    var getStoreDatasql = `SELECT * FROM Store_Details where STORENO=${oFinalOutput.storeno}`;
            db.query(getStoreDatasql, async function (err, rows, fields) {
           if (err) {
            res.status(500).send({ error: 'store data retreival failed!!' })
           }
         oFinalOutput.storename = rows[0].STORENAME;
        oFinalOutput.brand = rows[0].BRAND;
	var msg = "Hi "+ oFinalOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oFinalOutput.storename+".";
        var msgString = msg+"\n Your queue no is "+oFinalOutput.qno +".Your approx waiting time is "+oFinalOutput.waittime+".\nWe wish you a great shopping experience to you";
	var  info = await fast2sms.sendMessage({
	authorization:'Bc1nE7haDPtUV6zCmXZNLRYd4f5l3xHeuyoS9QFT2bMJviskIKdhEsZ40JMuplk9XN7za5Ie8DOvrGmT',
	message :msgString,
	numbers:[oFinalOutput.customerphone]
	});
	oFinalOutput.SMSsent = info.return;
        res.json(oFinalOutput)
  	})

          })
        })
      })

    }

  })
  //res.json(oFinalOutput)
})
module.exports = router;


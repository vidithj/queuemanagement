var express = require('express');
var router = express.Router();
var db = require('../db');
const fast2sms = require('fast-two-sms');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
const cron = require("node-cron");
var TinyURL = require('tinyurl');
dotenv.config({
path:'./.env'
});
var twilio_accountSid = process.env.TWILIO_ACCOUNTSID;
var twilio_authToken = process.env.TWILIO_AUTHTOKEN;
var twilio_client = require('twilio')(twilio_accountSid, twilio_authToken);

router.use(bodyParser.json()); // for parsing application/json
//router.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
/* get method for fetch all qno. */
router.get('/qinfo', function(req, res, next) {
console.log(process.env.API_KEY);
  var sql = "SELECT * FROM QManagement where OUTFLOW!=1";
  db.query(sql, function(err, rows, fields) {
    if (err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    res.json(rows)
  })
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* get method for fetch particular storeno. */
var finalData = {
"storeno":'',
"storename":'',
"brand":'',
"qinfo":[]
};
router.get('/qinfostore/:id', function(req, res, next) {
var storeno = req.params.id;
console.log(storeno);
 var getStoreDatasql = `SELECT * FROM Store_Details where STORENO=${storeno}`;
db.query(getStoreDatasql, function(err, rows, fields) {
    if (err) {
      res.status(500).send({ error: 'Something failed!' })
    }
    finalData.storename = rows[0].STORENAME;
    finalData.brand = rows[0].BRAND;
    finalData.storeno = rows[0].STORENO;
  })

  var sql = `SELECT * FROM QManagement where STORENO=${storeno} and OUTFLOW!=1`;
  db.query(sql, function(err, rows, fields) {
    if (err) {
      res.status(500).send({ error: 'Something failed!' })
    }
	finalData.qinfo = rows;
    res.json(finalData);
  })
});

/* get method for fetch particular qno. */
router.get('/qinfo/:storeid/:id', function(req, res, next) {
  var id = req.params.id;
var storeid = req.params.storeid;
console.log(id+"store"+storeid);
  var sql = `SELECT * FROM QManagement WHERE QNO =${id} and STORENO =${storeid} and OUTFLOW!=1`;
  db.query(sql, function(err, row, fields) {
    if(err) {
      res.status(500).send({ error: 'Something failed!' })
    }
	if(row[0]){
    res.json(row[0])
}else{
res.status(400).send('No information found for the qnumber'+id);
}
  })
});


/* update method for [articular qno */
router.post('/qupdate', function(req, res, next) {
  //var id = req.params.id;
  var cust_phone = req.body.customerphone;
  var storeno = req.body.storeno; 
  var  inflow = req.body.inflow;
  var outflow = req.body.outflow;
var headcount = req.body.headcount;
if(req.body.headcount)
{
headcount = req.body.headcount;
}else{
headcount = 1;
}
  var sql;
	if(inflow == 1){
  sql = `UPDATE QManagement SET INFLOW=1,OUTFLOW=0,HEADCOUNT=${headcount},CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
  }else if(outflow ==1){
sql = `UPDATE QManagement SET OUTFLOW=1,INFLOW=0,HEADCOUNT=${headcount},CHANGEDATETIME=NOW() WHERE STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
}
db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'inflow/outflow failed!' })
    }

 var getUpdatedrow = `SELECT * FROM QManagement where STORENO=${storeno} and CUSTOMERPHONE=${cust_phone}`;
  db.query(getUpdatedrow, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'get count error' })
    }
res.json(row[0]);
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
  priorityqno:'',
  location: '',
headcount : ''
// SMSsent : ''
};
var priorityqcount;
var insertqnoSQL ;
var currentTime;
var shortURL;
var currentqno;
router.post('/qbook', function (req, res, next) {
//console.log(req.body);
  var getCount = `SELECT SUM(HEADCOUNT) as sumhead FROM QManagement where INFLOW = 1 and STORENO=${req.body.storeno}`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured during the count!' })
    }
	if(row[0].sumhead)
    ActivequeueCount = row[0].sumhead;
else 
ActivequeueCount = 0;
console.log("activeq"+row[0].sumhead+"ho gya"+row[1]+"ek auyr"+ActivequeueCount);
  })
var selectpriorityqno = `SELECT MAX(PRIORITYQNO) as count FROM QManagement where OUTFLOW !=1 and STORENO=${req.body.storeno}`;
            db.query(selectpriorityqno,function (err, row, fields) {
              if (err) {
                res.status(500).send({ error: 'Oops an error occured during the priority que fetch!' })
              }
	if(row[0].count)
         priorityqcount =parseInt(row[0].count)+1;
else
priorityqcount = 1;
})
var selectqno = `SELECT MAX(QNO) as count FROM QManagement where OUTFLOW !=1 and STORENO=${req.body.storeno}`;
  db.query(selectqno, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured during the priority que fetch!' })
    }
	if(row[0].count)
    currentqno = parseInt(row[0].count) + 1;
else
currentqno = 1;
  })

  next()
}, function (req, res, next) {
console.log(req.body);
var options = {
    timeZone: "America/New_York",
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
};
var formatter = new Intl.DateTimeFormat([], options);
  var USATime = formatter.format(new Date());
 currentTime = new Date(USATime);
console.log(currentTime);
  var cust_phone = req.body.customerphone;
  var cust_name = req.body.customername;
  var storeno = req.body.storeno;
  var iscardholder = req.body.iscardholder;
  var headcount = req.body.headcount;
  var currentdatetime = new Date();
if(req.body.headcount){
headcount = req.body.headcount;
}else{
headcount = 1;
}

console.log(headcount);
  var getCount = `SELECT * FROM QManagement where CUSTOMERPHONE = ${cust_phone} and STORENO=${storeno}`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
	console.log(currentdatetime);
    if (row.length == 1) {
	var oresObj = {
         "qno" : '',
         "customername" :'',
         "storeno" : ''
        }
    oresObj.qno = row[0].QNO;
    oresObj.customername = row[0].CUSTOMERNAME;
    oresObj.storeno = row[0].STORENO;
      res.status(400).send(oresObj);
    } else if (row.length == 0) {
/*	if(currentTime.getHours() >= 18 && currentTime.getHours() <= 19 && ActivequeueCount > 20){
	res.status(400).send({ msg: 'Thank you for visiting our Store but we are currently closing. Hope you visit us tomorrow again' });
	return;
	}
	if(currentTime.getHours()>= 19 || currentTime.getHours()<= 11){
	res.status(400).send({ msg: 'Thank you for visiting our Store.We are open from 12PM to 7PM everyday. Hope to see you soon.' });
	return;	
} */
var sql = `INSERT INTO QManagement (CUSTOMERNAME,CUSTOMERPHONE,STORENO,ISCARDHOLDER,HEADCOUNT, CREATEDDATETIME) VALUES ("${cust_name}","${cust_phone}", "${storeno}", "${iscardholder}","${headcount}",NOW())`;
      db.query(sql, function (err, result) {
        if (err) {
          res.status(500).send({ error: 'Oops we coulnt create a queue for you. Please again!' })
        }
        //console.log(result);
        var updatedRow = result.insertId;
	ActivequeueCount = ActivequeueCount;
	if(ActivequeueCount>20)
            oFinalOutput.waittime = parseInt(ActivequeueCount/20);
            else
            oFinalOutput.waittime ="0";
	if(iscardholder == 1){
	oFinalOutput.priorityqno=priorityqcount;
	//console.log(oFinalOutput.priorityqno+"text"+priorityqcount);
	insertqnoSQL = `UPDATE QManagement SET QNO=${currentqno},WAITTIME="${oFinalOutput.waittime}",PRIORITYQNO=${oFinalOutput.priorityqno} where id=${updatedRow}`;
       // console.log(insertqnoSQL); 
	 }else{
	oFinalOutput.priorityqno=0;
        insertqnoSQL = `UPDATE QManagement SET QNO=${currentqno},WAITTIME="${oFinalOutput.waittime}" where id=${updatedRow}`;
       	}
	   db.query(insertqnoSQL, function (err, rows, fields) {
          if (err) {
            res.status(500).send({ error: 'update qno failed!!'+err })
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
oFinalOutput.headcount = rows[0].HEADCOUNT;
            //oFinalOutput.currentqueue = ActivequeueCount
	    var getStoreDatasql = `SELECT * FROM Store_Details where STORENO=${oFinalOutput.storeno}`;
            db.query(getStoreDatasql, function (err, rows, fields) {
           if (err) {
            res.status(500).send({ error: 'store data retreival failed!!' })
           }
         oFinalOutput.storename = rows[0].STORENAME;
         oFinalOutput.brand = rows[0].BRAND;
	oFinalOutput.location = rows[0].Location;
var Surl ="https://master.d1zs89y43xrlec.amplifyapp.com/bookingConfirmation?storeName="+oFinalOutput.storename+"&qno="+oFinalOutput.qno+"&customerName="+oFinalOutput.customername+"&location="+oFinalOutput.location+"&brand="+oFinalOutput.brand+"&waitTime="+oFinalOutput.waittime+"&isCardHolder="+iscardholder ;
	// oFinalOutput.priorityqno = '';
	console.log(Surl);

Surl = encodeURI(Surl);
console.log(Surl);
/*var msg = "Hi "+ oFinalOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oFinalOutput.storename+","+oFinalOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oFinalOutput.priorityqno+".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here</a> \n"+Surl;
var msgString = msg+"\n Your queue no is "+oFinalOutput.qno +".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }*/ 
TinyURL.shorten(Surl).then(function(rurl) {
    console.log(rurl)
Surl = rurl;
var msg = "Hi "+ oFinalOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oFinalOutput.storename+","+oFinalOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oFinalOutput.priorityqno+".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here \n"+Surl;
var msgString = msg+"\n Your queue no is "+oFinalOutput.qno +".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }
console.log(oFinalOutput.customerphone);
twilio_client.messages.create({
        to:oFinalOutput.customerphone,
        from:'+17135681789',
        body :finalmsg
},function (err,msg){
        if(err){
        console.log(err);       
} 
console.log(msg);
});  
res.json(oFinalOutput)
}, function(err) {
    console.log(err)
Surl = encodeURI(Surl);
var msg = "Hi "+ oFinalOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oFinalOutput.storename+","+oFinalOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oFinalOutput.priorityqno+".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here \n" + Surl;
var msgString = msg+"\n Your queue no is "+oFinalOutput.qno +".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }
twilio_client.messages.create({
        to:oFinalOutput.customerphone,
        from:'+17135681789',
        body :finalmsg
},function (err,msg){
        if(err){
        console.log(err);       
} 
console.log(msg);
});  

res.json(oFinalOutput)
})
/*
      twilio_client.messages.create({
        to:oFinalOutput.customerphone,
        from:'+17135681789',
        body :finalmsg
},function (err,msg){
        if(err){
        console.log(err);       
} 
console.log(msg);
});  
console.log("here is "+finalmsg); 
    res.json(oFinalOutput) */
  	}) 

          })
        })
      })

    }

  })
  //res.json(oFinalOutput)
});

/* inbound sms trigger */
var ActiveCount;
var oOutput = {
  customername: '',
  customerphone: '',
  storeno: '',
  qno: '',
  waittime: '',
  storename: '',
  brand: '',
  priorityqno:'',
  location: '',
headcount : ''
// SMSsent : ''
};
var prioritycount;
var insertSQL ;
var currentTime;
var shortURL;
var currentqno;
var storeno;
router.post('/qsmsbook', function (req, res, next) {
console.log(req.body);
var msgFrom = req.body.From;
var msgBody = req.body.Body;
storeno = msgBody.split(" ")[1]
//code from qbook
var getCount = `SELECT SUM(HEADCOUNT) as sumhead FROM QManagement where INFLOW = 1 and STORENO=${storeno}`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured during the count!' })
    }
	if(row[0].sumhead)
  ActiveCount = row[0].sumhead;
else 
ActiveCount = 0;
console.log("activeq"+row[0].sumhead+"ho gya"+row[1]+"ek auyr"+ActiveCount);
  })
var selectpriorityqno = `SELECT MAX(PRIORITYQNO) as count FROM QManagement where OUTFLOW !=1 and STORENO=${storeno}`;
            db.query(selectpriorityqno,function (err, row, fields) {
              if (err) {
                res.status(500).send({ error: 'Oops an error occured during the priority que fetch!' })
              }
	if(row[0].count)
         storeno =parseInt(row[0].count)+1;
else
prioritycount = 1;
})
var selectqno = `SELECT MAX(QNO) as count FROM QManagement where OUTFLOW !=1 and STORENO=${storeno}`;
  db.query(selectqno, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured during the priority que fetch!' })
    }
	if(row[0].count)
    currentqno = parseInt(row[0].count) + 1;
else
currentqno = 1;
  })

  next()
}, function (req, res, next) {
console.log(req.body);
var options = {
    timeZone: "America/New_York",
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
};
var formatter = new Intl.DateTimeFormat([], options);
  var USATime = formatter.format(new Date());
 currentTime = new Date(USATime);
console.log(currentTime);
  var cust_phone = req.body.From;
  var cust_name = "Customer";
  var iscardholder = 0;
  var headcount = 1;
  var currentdatetime = new Date();
if(req.body.headcount){
headcount = 1;
}else{
headcount = 1;
}

console.log(headcount);
  var getCount = `SELECT * FROM QManagement where CUSTOMERPHONE = ${cust_phone} and STORENO=${storeno}`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured. Please try again later' })
    }
	console.log(currentdatetime);
    if (row.length == 1) {
	var oresObj = {
         "qno" : '',
         "customername" :'',
         "storeno" : ''
        }
    oresObj.qno = row[0].QNO;
    oresObj.customername = row[0].CUSTOMERNAME;
    oresObj.storeno = row[0].STORENO;
      res.status(400).send(oresObj);
    } else if (row.length == 0) {
/*	if(currentTime.getHours() >= 18 && currentTime.getHours() <= 19 && ActivequeueCount > 20){
	res.status(400).send({ msg: 'Thank you for visiting our Store but we are currently closing. Hope you visit us tomorrow again' });
	return;
	}
	if(currentTime.getHours()>= 19 || currentTime.getHours()<= 11){
	res.status(400).send({ msg: 'Thank you for visiting our Store.We are open from 12PM to 7PM everyday. Hope to see you soon.' });
	return;	
} */
var sql = `INSERT INTO QManagement (CUSTOMERNAME,CUSTOMERPHONE,STORENO,ISCARDHOLDER,HEADCOUNT, CREATEDDATETIME) VALUES ("${cust_name}","${cust_phone}", "${storeno}", "${iscardholder}","${headcount}",NOW())`;
      db.query(sql, function (err, result) {
        if (err) {
          res.status(500).send({ error: 'Oops we coulnt create a queue for you. Please again!' })
        }
        //console.log(result);
        var updatedRow = result.insertId;
        ActiveCount = ActiveCount;
	if(ActiveCount>20)
  oOutput.waittime = parseInt(ActiveCount/20);
            else
            oOutput.waittime ="0";
	if(iscardholder == 1){
    oOutput.priorityqno=prioritycount;
	//console.log(oFinalOutput.priorityqno+"text"+priorityqcount);
	insertSQL = `UPDATE QManagement SET QNO=${currentqno},WAITTIME="${oOutput.waittime}",PRIORITYQNO=${oOutput.priorityqno} where id=${updatedRow}`;
       // console.log(insertSQL); 
	 }else{
    oOutput.priorityqno=0;
    insertSQL = `UPDATE QManagement SET QNO=${currentqno},WAITTIME="${oOutput.waittime}" where id=${updatedRow}`;
       	}
	   db.query(insertSQL, function (err, rows, fields) {
          if (err) {
            res.status(500).send({ error: 'update qno failed!!'+err })
          }
          var getupdateDatasql = `SELECT * FROM QManagement where id=${updatedRow}`;
          db.query(getupdateDatasql, function (err, rows, fields) {
            if (err) {
              res.status(500).send({ error: 'insert data retrieval failed!!' })
            }
            oOutput.customername = rows[0].CUSTOMERNAME;
            oOutput.customerphone = rows[0].CUSTOMERPHONE;
            oOutput.storeno = rows[0].STORENO;
            oOutput.qno = rows[0].QNO;
            oOutput.headcount = rows[0].HEADCOUNT;
            //oFinalOutput.currentqueue = ActivequeueCount
	    var getStoreDatasql = `SELECT * FROM Store_Details where STORENO=${oOutput.storeno}`;
            db.query(getStoreDatasql, function (err, rows, fields) {
           if (err) {
            res.status(500).send({ error: 'store data retreival failed!!' })
           }
           oOutput.storename = rows[0].STORENAME;
           oOutput.brand = rows[0].BRAND;
           oOutput.location = rows[0].Location;
var Surl ="https://master.d1zs89y43xrlec.amplifyapp.com/bookingConfirmation?storeName="+oFinalOutput.storename+"&qno="+oFinalOutput.qno+"&customerName="+oFinalOutput.customername+"&location="+oFinalOutput.location+"&brand="+oFinalOutput.brand+"&waitTime="+oFinalOutput.waittime+"&isCardHolder="+iscardholder ;
	// oFinalOutput.priorityqno = '';
	console.log(Surl);

Surl = encodeURI(Surl);
console.log(Surl);
/*var msg = "Hi "+ oFinalOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oFinalOutput.storename+","+oFinalOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oFinalOutput.priorityqno+".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here</a> \n"+Surl;
var msgString = msg+"\n Your queue no is "+oFinalOutput.qno +".Your approx waiting time is "+oFinalOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }*/ 
TinyURL.shorten(Surl).then(function(rurl) {
    console.log(rurl)
Surl = rurl;
var msg = "Hi "+ oOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oOutput.storename+","+oOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oOutput.priorityqno+".Your approx waiting time is "+oOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here \n"+Surl;
var msgString = msg+"\n Your queue no is "+oOutput.qno +".Your approx waiting time is "+oOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are available here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }
console.log(oOutput.customerphone);
res.send(`<Response><Message>${finalmsg}</Message></Response>`);
//res.json(oOutput)
}, function(err) {
    console.log(err)
Surl = encodeURI(Surl);
var msg = "Hi "+ oOutput.customername +","+"\n You have been successfully enrolled to our Queue at Store "+oOutput.storename+","+oOutput.location;
var msgstring2 = msg+"\nYou are our priority customer and your priority queue no is "+oOutput.priorityqno+".Your approx waiting time is "+oOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here \n" + Surl;
var msgString = msg+"\n Your queue no is "+oOutput.qno +".Your approx waiting time is "+oOutput.waittime+"hrs.\nWe wish you a great shopping experience.\n Your booking details are avaiable here\n"+Surl;
        var finalmsg;   
if(iscardholder == 1){
finalmsg = msgstring2;
        }else{
finalmsg= msgString;
        }
res.send(`<Response><Message>${finalmsg}</Message></Response>`);
})
  	}) 

          })
        })
      })

    }

  })
//code ended
//res.send(`<Response><Message>Hello ${msgFrom} and said ${msgBody}.</Message></Response>`);
});







/*inbound sms end */


/* delete particular id  */
router.delete('/qdelete/:id', function(req, res, next) {
  var id = req.params.id;
  var sql = `DELETE FROM QManagement WHERE id=${id}`;
  db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'delete id failed!' })
    }
    res.json({'status': 'success'})
  })
});

/* delete whole table content */
router.delete('/qdelete', function(req, res, next) {
  var id = req.params.id;
  var sql = `TRUNCATE QManagement`;
  db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'truncate failed!' })
    }
    res.json({'status': 'success'})
  })
});

/* delete for particular store */ 
router.delete('/storeqdelete/:id', function(req, res, next) {
  var id = req.params.id;
  var sql = `DELETE FROM QManagement WHERE STORENO=${id}`;
  db.query(sql, function(err, result) {
    if(err) {
      res.status(500).send({ error: 'delete store failed!' })
    }
    res.json({'status': 'success'})
  })
});

router.get('/schedulejob', function (req, res, next) {
console.log('smthing1');
var task = cron.schedule("* * * * *", function() {
  console.log("---------------------");
  console.log("Running Cron Job");
var options = {
    timeZone: "America/New_York",
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
};

var formatter = new Intl.DateTimeFormat([], options);
var currentTime = formatter.format(new Date());
if(new Date(currentTime).getHours() == 23 && new Date(currentTime).getMinutes() == 30){
cronSchedule();
}else{
console.log('Not the exact time');
}
  },{
scheduled: true,
timezone: 'America/New_York'
});
console.log('smthing');
task.start();

res.send('ended');
});

async function cronSchedule(){
console.log('func');
var sql = `TRUNCATE QManagement`;
  db.query(sql, function(err, result) {
    if(err) {
      console.log('truncate failed!');
    }
else
console.log('truncate done');
}); 

};

router.get('/schedulesmsjob/:id', function (req, res, next) {
  console.log('smthing1');
var id = req.params.id;
var myVar;
if(id == 1){
myVar = setInterval(cronsmsSchedule, 1000);
}
else{
clearInterval(myVar);
}

});


async function cronsmsSchedule() {
  console.log('func');
  var getCount = `SELECT * FROM QManagement where STORENO='3010'`;
  db.query(getCount, function (err, row, fields) {
    if (err) {
      res.status(500).send({ error: 'Oops an error occured during the count!' })
    }
    if (row)
      ActivequeueCount = row.length;
    else
      ActivequeueCount = 0;
  })
  console.log(ActivequeueCount);

};




module.exports = router;



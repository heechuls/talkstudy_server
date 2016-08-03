var FCM = require('fcm-push'); var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var path = require('path');
//var upload = multer({ dest: './uploads/' });
var upload = multer({
    dest: './uploads/', rename: function (fieldname, filename, req, res) {
        var filename = req.body["receiver"] + "-" + currentTime()
        console.log("Created File : " + filename);
        return filename;
    }
});

var serverKey = 'AIzaSyDDOwrBzOvAbS2jC_Crg8ba3zk5xSetz6o';
var firebase = require('firebase');
var dbhandler = require("./dbhandler");

var fcm = new FCM(serverKey);
var app = new express();

var apn = require("apn");
var options = {
    gateway: "gateway.sandbox.push.apple.com",
    cert: './cert.pem',
    key: './key.pem',
    passphrase: "slrtm978!"
};
var home = "http://lunar-pic.com:6500";
var urloption = "short";
var GoogleUrl = require('google-url');
googleUrl = new GoogleUrl({ key: 'AIzaSyBdtCANYjO3hONRi3-OP0eU6ezn-iIWng0' });

var apnConnection = new apn.Connection(options);

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var token_list = [
    'f0ywL3yu1u0:APA91bGpIldkYUHqtwDx5VFklWChKPTppt99SgCP8MEnlyRvxPAjF4CqrUOa7WvJVKUAimVfxH2Kbid8UXThdiMphwcBChhlvcYfkZmvQ9vaZcRtDCgzs7BzMXRvZsOX2AP3SZ0s0tYa',
    '376a3aa6ac2a76ae77f21c93ce3fccdeca6efcebaf50338c66106f71500f000a'//,
];

function sendFCM(token, title, body, data) {
    var message = {
        to: token,
        //registration_ids: token_list,
        collapse_key: data["code"],
        data: data,
        notification: {
            title: title,
            body: body,
            sound: 'default'
        },
        priority: 'high'
    };
    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!" + err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
}
function sendApns(token, title, payload) {
    var myDevice = new apn.Device(token);
    var note = new apn.Notification();

    note.badge = 1;
    note.sound = "default";
    note.alert = title;
    note.payload = payload;

    apnConnection.pushNotification(note, myDevice);
}


function send_bulk_push() {
    for (var i in token_list) {
        send_push(token_list[i], 'Hi', 'message test');
    }
};

app.use('/uploads', express.static('./uploads'));
app.use('/download', express.static('./download'));

app.get('/push_notice', function (req, res) {
    res.render('push');

});
app.get('/push_class_participation', function (req, res) {
    sendPushForClass();
    res.status(200).end();
});

app.get('/adduser', function (req, res) {
    res.render('adduser');

});
app.get('/download', function (req, res) {
    res.render('download');

});

app.post('/adduser', function (req, res) {
    console.log(req.body);
    console.log(dbhandler);
    if (addUser(req.body["userid"], req.body["name"], req.body["userid"], req.body["gender"],
        req.body["email"], req.body["speaking_level"], req.body["pronunciation_level"]
        , req.body["remained_class"])) {
        setStudyResultItems(req.body["userid"])
        res.status(200).end();
    }
    else {
        res.send("필드를 모두 입력해주세요.");
    }
});
//(userid, name, phoneno, gender, email, speaking_level, pronunciation_level, remained_class)

app.post('/push_notice', function (req, res) {
    console.log(req.body);
    sendPushAll(req.body["title"], { code: "NOTICE", body: req.body["body"] });
    res.status(200).end();
});

app.post('/upload', upload, function (req, res) {
    console.log(req.body); //form fields
	/* example output:
	{ title: 'abc' }
	 */
	/* example output:
            { fieldname: 'upl',
              originalname: 'grumpy.png',
              encoding: '7bit',
              mimetype: 'image/png',
              destination: './uploads/',
              filename: '436ec561793aa4dc475a88e84776b1b9',
              path: 'uploads/436ec561793aa4dc475a88e84776b1b9',
              size: 277056 }
	 */
    console.log(req.files);
    var url = home + "/link/" + req.files["file"]["name"];
    var downUrl = home + "/uploads/" + req.files["file"]["name"];
    //res.send(url);
    var retval;
    if (urloption == "short") {
        googleUrl.shorten(url, function (err, shortUrl) {
            console.log(new Date().toString() + " : " + shortUrl);
            //      retval = createOutput(downUrl, shortUrl);
            //      console.log(retval);
            //      res.send(retval);
            res.status(200).end();
            var full_msg = shortUrl + "\"";
            //    sendLMS(sms_sender, req.body["receiver"], "Nike",  full_msg);
            insertRecordedSpeech(req.body["receiver"], req.files["file"]["name"], downUrl);
        });
    }
    else {
        retval = createOutput(downUrl, url);
        res.send(retval);
        res.status(200).end();
    }
});

app.use('/uploads', express.static('./uploads'));

// index.js end of file
var port = 6500;

app.listen(port, function () { console.log('listening on port ' + port); });
function minuteInterval() {
    var current = new Date();
    console.log(current.toTimeString());
    var hour = current.getHours();
    var min = current.getMinutes();
    if ((min == 0) && (hour == 15 || hour == 16 || hour == 18)) {
        isClassToday(function (retval) {
            if (retval == true) { }
            sendPushAll("금일 스터디에 참여하시겠습니까?", { code: "STUDY_PARTICIPATION", body: "하이요" });
        });
    }
    if ((min == 0 && hour == 20) || (min == 10 && hour == 21) || (min == 10 && hour == 22)) {
        isClassToday(function (retval) {
            if (retval == true) { }
            sendPushAll("금일 전화영어에 참여하시겠습니까?", { code: "PHONETALK_PARTICIPATION", body: "하이요" });
        });
    }
}

setInterval(minuteInterval, 60000);

function isClassToday(done) {
    var classRef = firebase.database().ref().child('class/');
    classRef.child(new Date().yyyymmdd()).once('value', function (snapshot) {
        console.log(snapshot.val());
        today = new Date();
        if (snapshot.exists())
            done(false);
        else if (today.getDay() == 0 || today.getDay() == 5)
            done(false);
        else done(true);
    });
}
function sendPushForClass() {
    sendPushAll("금일 스터디에 참여하시겠습니까?", { code: "STUDY_PARTICIPATION", body: "금일 스터디 참석 여부를 알려주세요." });
}

var config = {
    apiKey: "AIzaSyAtaNqB8hTSthvqYBpuVHfDml6x-4scozQ",
    authDomain: "talktudy-b0464.firebaseapp.com",
    databaseURL: "https://talktudy-b0464.firebaseio.com",
    storageBucket: "talktudy-b0464.appspot.com",
};
firebase.initializeApp(config);

//sendApns(token_list[0], "금일 수업에 참여하시겠습니까?");

sendPushAll("금일 스터디에 참여하시겠습니까?", {code : "STUDY_PARTICIPATION", body : "금일 스터디 참석 여부를 알려주세요."});
//sendPushAll("금일 전화영어에 참여하시겠습니까?", { code: "PHONETALK_PARTICIPATION", body: "하이요" });

function sendPushAll(message, payload, done) {
    var userRef = firebase.database().ref('/user/');
    userRef.once("value", function (allUserSnapshot) {
        allUserSnapshot.forEach(function (snapshot) {
            var user = {
                name: snapshot.key,
                token: snapshot.val()._token,
                device_type: snapshot.val().device_type
            };
            if (user.device_type == 1)
                sendFCM(user.token, message, payload["body"], { code: payload["code"], body: payload["body"] });
            else if (user.device_type == 0)
                sendApns(user.token, message, payload);
        });
        if (done != null)
            done();
    });
    return true;
}

function addUser(userid, name, phoneno, gender, email, speaking_level, pronunciation_level, remained_class) {

    if (userid == '' || name == '' || gender == '' || email == '' || speaking_level == '' || pronunciation_level == '' || remained_class == '') {
        return false;
    }

    var date = new Date().yyyymmdd();
    var user = {
        name: name,
        phoneno: phoneno,
        gender: gender,
        email: email,
        speaking_level: speaking_level,
        pronunciation_level: pronunciation_level,
        registered_date: date,
        remained_class: remained_class,
        purchased_cost: 0,
        rate_failed: 0,
        rate_passed: 0,
        valid: 1,
        remained_purchase: 19000,
        nationality:0
    }
    var userRef = firebase.database().ref('/user/' + userid);
    userRef.update(user);
    return true;
}
function setStudyResultItem(userid, studyid, name) {
    var update = {};
    update['/study_result/' + userid + "/" + studyid] = {
        name: name,
        result: 0,
        date: new Date().toDateString()
    };
    return firebase.database().ref().update(update);
}
function setStudyResultItems(userid) {
    var study_items = ["시제", "완료", "조동사", "To부정사", "동명사", "수동태", "전치사", "관계대명사",
        "접속사", "부사", "형용사", "가정법", "비교급", "수량", "비인칭 주어", "가족", "애완동물", "도둑/강도",
        "스포츠", "레저/취미", "패션", "로또", "여행", "맛집", "꿈", "미드", "친구", "북한", "결혼", "연애"];
    for (var i in study_items) {
        setStudyResultItem(userid, i, study_items[i]);
    }
}
function insertRecordedSpeech(userid, filename, url) {
    var update = {};
    update['/recorded_speech/' + userid + "/" + currentTime()] = {
        filename: filename,
        url: url
    };
    return firebase.database().ref().update(update);
}

function currentTime() {
    var current = new Date();
    var yyyy = current.getFullYear().toString();
    var mm = (current.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = current.getDate().toString();
    var date = yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
    var hour = current.getHours().toString();
    var min = current.getMinutes().toString();
    var sec = current.getSeconds().toString();
    var time = (hour[1] ? hour : "0" + hour[0]) + (min[1] ? min : "0" + min[0]) + (sec[1] ? sec : "0" + sec[0]); // padding

    return date + "-" + time;
}

Date.prototype.yyyymmdd = function () {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = this.getDate().toString();
    return yyyy + "-" + (mm[1] ? mm : "0" + mm[0]) + "-" + (dd[1] ? dd : "0" + dd[0]); // padding
}

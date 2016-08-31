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
require('events').EventEmitter.defaultMaxListeners = Infinity;

var fcm = new FCM(serverKey);
var app = new express();

var apn = require("apn");
var options = {
    //gateway: "gateway.sandbox.push.apple.com",
    gateway: "gateway.push.apple.com",
    cert: './cert.pem',
    key: './key.pem',
    passphrase: "slrtm978!"
};
//var PHONETALK_PARTICIPANT = "/phonetalk_test/";
var PHONETALK_PARTICIPANT = "/phonetalk_participant/";

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

function sendFCM(userid, token, title, body, data) {
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
        priority: 'high',
        foreground:true
    };
    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!" + err);
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
    console.log("FCM Sent : " + userid);
}
function sendApns(userid, token, title, payload) {
    var myDevice = new apn.Device(token);
    var note = new apn.Notification();

    note.badge = 1;
    note.sound = "default";
    note.alert = title;
    note.body = "body";
    note.payload = payload;

    apnConnection.pushNotification(note, myDevice);
    console.log("APNS Sent : " + userid);
}


function send_bulk_push() {
    for (var i in token_list) {
        send_push(token_list[i], 'Hi', 'message test');
    }
};

app.use('/uploads', express.static('./uploads'));
app.use('/download', express.static('./download'));
app.use('/uploads', express.static('./uploads'));

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
    //res.sendfile("./public/download.html");
});

app.get('*', function(req, res) {
    // load the single view file
    // (angular will handle the page changes on the front-end)
    res.sendfile('./public/index.html');
});

app.post('/adduser', function (req, res) {
    console.log(req.body);
    if(req.body["password"] != "xhrxjel01"){
        res.send("비밀번호를 확인해주세요.");
        return;
    }
    if (addUser(req.body["userid"], req.body["name"], req.body["userid"], req.body["gender"],
        req.body["email"], req.body["speaking_level"], req.body["pronunciation_level"]
        , req.body["remained_class"], req.body["nationality"])) {
        setStudyResultItems(req.body["userid"])
        res.send(req.body["name"] + " 사용자가 등록되었습니다");
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
    res.end();
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

var port = 6500;

app.listen(port, function () { console.log('listening on port ' + port); });
function minuteInterval() {
    var current = new Date();
    var day = current.getDay();
    console.log(current.toTimeString());
    var hour = current.getHours();
    var min = current.getMinutes();
    if (((min == 0) && (hour == 15 || hour == 16 || hour == 18) && (day >=1 && day <=4)) ||
    ((min == 0) && (hour == 12) && (day == 6))) {
        isClassToday(function (retval) {
            if (retval == true)
                sendPushAll("금일 스터디에 참여하시겠습니까?", { code: "STUDY_PARTICIPATION", body: "앱에서 스터디 참여 여부를 답해주세요." });
        });
    }
    if (min == 10 && hour == 22) {
        sendPushAll("금일 전화영어에 참여하시겠습니까?", { code: "PHONETALK_PARTICIPATION", body: "앱에서 전화영어 참여 여부를 답해주세요." });
    }
    if (min == 50 && hour == 22) {
        matchPhoneTalk();
        sendPushAll("전화영어 매치가 되었습니다.", { code: "PHONETALK_MATCHED", body: "" });
    }
}

function minuteInterval2() {
    var current = new Date();
    var hour = current.getHours();
    var min = current.getMinutes();
    var day = current.getDay();
    if (((min == 0) && (hour == 15 || hour == 16 || hour == 18) && (day >=1 && day <=4)) ||
         ((min == 0) && (hour == 12) && (day == 6 || day == 0))) {
        console.log(current.toTimeString() + " : Study Notification");
        isClassToday(function (retval) {
            if (retval == true) {
                getAllUserListForPush(function(user_list){
                    for(var i in user_list){
                        var user = user_list[i];
                        isClassConfirmed(user, user.userid, function(user, retval){               
                            if(retval == false)     
                                sendPush(user, user.name + "님 금일 스터디에 참여하시겠습니까?", { code: "STUDY_PARTICIPATION", body: "앱에서 스터디 참여 여부를 답해주세요." });
                        });
                    }
                });
            }
        });
    }
    if (min == 10 && hour == 22){ //((min == 0 && hour == 20) || (min == 10 && hour == 21) || (min == 10 && hour == 22)) {
        console.log(current.toTimeString() + " : Phonetalk Notification");
        getAllUserListForPush(function (user_list) {
            for (var i in user_list) {
                var user = user_list[i];
                isPhonetalkConfirmed(user, user.userid, function (user, retval) {
                    if(retval == false)
                        sendPush(user, user.name + "님 금일 전화영어에 참여하시겠습니까?", { code: "PHONETALK_PARTICIPATION", body: "앱에서 전화영어 참여 여부를 답해주세요." });
                });
            }
        });
    }
    if(min == 50 && hour == 22) {
        console.log(current.toTimeString() + " : Phonetalk Match");
        matchPhoneTalk();
    }
    if(min == 51 && (hour == 22 || hour == 21 )) {
        console.log(current.toTimeString() + " : Phonetalk Match Notification");
        getAllMatchedUserList(function(matched_list){
            for(var i in matched_list){
                var user = matched_list[i];
                sendPush(user, user.name + "님 전화영어 매치가 되었습니다.", { code: "PHONETALK_MATCHED", body: user.matched_name + "(" + user.matched +")" + "님께 23시에 전화를 주시기 바랍니다."});
            }
        });
        getAllUnmatchedUserList(function(unmatched_list){
            for(var i in unmatched_list){
                var user = unmatched_list[i];
                sendPush(user, user.name + "님 전화영어 매치되지 않았습니다.", { code: "PHONETALK_NOT_MATCHED", body: "다음 기회를 이용해주세요." });
            }
        });

    }
    if(min == 00 && hour == 23) {
        console.log(current.toTimeString() + " : Phonetalk Start Notification");
        getAllMatchedUserList(function(user_list){
            for(var i in user_list){
                var user = user_list[i];
                sendPush(user, user.name + "님 전화영어가 시작되었습니다.", { code: "PHONETALK_STARTED", body: user.matched_name + "(" + user.matched +")" + "님께 바로 전화를 주시기 바랍니다."});
            }
        });
    }
    if(min == 10 && hour == 23) {
        console.log(current.toTimeString() + " : Phonetalk End Notification");
        getAllMatchedUserList(function(user_list){
            for(var i in user_list){
                var user = user_list[i];
                sendPush(user, user.name + "님 전화영어 10분이 종료되었습니다.", { code: "PHONETALK_ENDED", body: "즐거운 시간이 되었나요? 전화영어를 마무리해주세요."});
            }
        });
    }
}

function isClassConfirmed(user, userid, done){
    firebase.database().ref('/study_activity/' + userid + "/" + new Date().yyyymmdd() + "/class_participation").once("value", function (snapshot) {
        if(snapshot.exists())
            done(user, true);
        else done(user, false);
    });
}

function isPhonetalkConfirmed(user, userid, done){
    firebase.database().ref('/study_activity/' + userid + "/" + new Date().yyyymmdd() + "/phonetalk_participation").once("value", function (snapshot) {
        if(snapshot.exists())
            done(user, true);
        else done(user, false);
    });
}

function isClassToday(done) {
    var classRef = firebase.database().ref().child('class/');
    classRef.child(new Date().yyyymmdd()).once('value', function (snapshot) {
        today = new Date();
        if (snapshot.exists())
            done(false);
        else if (today.getDay() == 5)
            done(false);
        else done(true);
    });
}

var config = {
    apiKey: "AIzaSyAtaNqB8hTSthvqYBpuVHfDml6x-4scozQ",
    authDomain: "talktudy-b0464.firebaseapp.com",
    databaseURL: "https://talktudy-b0464.firebaseio.com",
    storageBucket: "talktudy-b0464.appspot.com",
};
firebase.initializeApp(config);

function sendPushAll(message, payload, done) {
    var userRef = firebase.database().ref('/user/');
    userRef.once("value", function (allUserSnapshot) {
        allUserSnapshot.forEach(function (snapshot) {
            var user = {
                name: snapshot.key,
                token: snapshot.val()._token,
                device_type: snapshot.val().device_type,
                userid: snapshot.val().userid
            };
            if (user.device_type == 1 && user.token != undefined && user.token != "WEB")
                sendFCM(user.userid, user.token, message, payload["body"], { code: payload["code"], body: payload["body"] });
            else if (user.device_type == 0 && user.token != undefined && user.token != "WEB")
                sendApns(user.userid, user.token, message, payload);
        });
        if (done != null)
            done();
    });
}

function sendPush(user, message, payload, done) {
    if (user.device_type == 1 && user.token != undefined && user.token != "WEB")
        sendFCM(user.userid, user.token, message, payload["body"], { code: payload["code"], body: payload["body"] });
    else if (user.device_type == 0 && user.token != undefined && user.token != "WEB")
        sendApns(user.userid, user.token, message, payload);

    if (done != null)
        done();
}

function getAllUserListForPush(done) {
    var userRef = firebase.database().ref('/user/');
    userRef.once("value", function (allUserSnapshot) {
        var user_list = new Array();

        allUserSnapshot.forEach(function (snapshot) {
            var user = {
                userid: snapshot.key,
                token: snapshot.val()._token,
                device_type: snapshot.val().device_type,
                name: snapshot.val().name,                
            };
            user_list.push(user);
        });
        if (done != null)
            done(user_list);
    });
}

function getAllMatchedUserList(done) {
    var userRef = firebase.database().ref(PHONETALK_PARTICIPANT + new Date().yyyymmdd() + "/matched");
    userRef.once("value", function (allUserSnapshot) {
        var user_list = new Array();

        allUserSnapshot.forEach(function (snapshot) {
            var user = {
                userid: snapshot.key,
                token: snapshot.val().token,
                device_type: snapshot.val().device_type,
                name: snapshot.val().name,
                matched: snapshot.val().matched,
                matched_name: snapshot.val().matched_name                
            };
            user_list.push(user);
        });
        if (done != null)
            done(user_list);
    });
}

function getAllUnmatchedUserList(done) {
    var userRef = firebase.database().ref(PHONETALK_PARTICIPANT + new Date().yyyymmdd() + "/unmatched");
    userRef.once("value", function (allUserSnapshot) {
        var user_list = new Array();

        allUserSnapshot.forEach(function (snapshot) {
            var user = {
                userid: snapshot.key,
                token: snapshot.val().token,
                device_type: snapshot.val().device_type,
                name: snapshot.val().name,                
            };
            user_list.push(user);
        });
        if (done != null)
            done(user_list);
    });
}

function addUser(userid, name, phoneno, gender, email, speaking_level, pronunciation_level, remained_class, nationality) {

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
        rate_failed: 0,
        rate_passed: 0,
        valid: 1,
        remained_purchase: 0,
        nationality:nationality
    }
    var userRef = firebase.database().ref('/user/' + userid);
    userRef.setWithPriority(user, date);
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

function matchPhoneTalk(done){
    function getUserList(onComplete){
        var user_list = new Array();
        var userRef = firebase.database().ref(PHONETALK_PARTICIPANT + new Date().yyyymmdd());
        userRef.once("value", function (allUserSnapshot) {
            allUserSnapshot.forEach(function (snapshot) {
                if (snapshot.key != "matched" && snapshot.key != "unmatched") {
//                    console.log(snapshot.key);
                    var user = {
                        userid: snapshot.key,
                        token: snapshot.val()._token,
                        device_type: snapshot.val().device_type,
                        gender: snapshot.val().gender,
                        duration: snapshot.val().duration,
                        time: snapshot.val().time,
                        speaking_level: snapshot.val().level,
                        name:snapshot.val().name
                    };
                    user_list.push(user);
                }
            });
            if (onComplete != null)
                onComplete(user_list);
        });
    }
    function setMatch(from, to) {
        var matchRef = firebase.database().ref(PHONETALK_PARTICIPANT + new Date().yyyymmdd() + "/matched");
        var activityRef = firebase.database().ref("/study_activity/");        
        
        from.matched = to.userid;
        from.matched_name = to.name;
        to.matched = from.userid;   
        to.matched_name = from.name;

        matchRef.child(from.userid).set(from);
        matchRef.child(to.userid).set(to);
        
        activityRef.child(from.userid + "/" + new Date().yyyymmdd()).update({matched : to.userid, matched_name : to.name});
        activityRef.child(to.userid + "/" + new Date().yyyymmdd()).update({matched : from.userid, matched_name : from.name});
        console.log("Matched : " + to.userid + " = " + from.userid);
    }
    function setUnMatch(user) {
        var ref = firebase.database().ref(PHONETALK_PARTICIPANT + new Date().yyyymmdd() + "/unmatched");
        var activityRef = firebase.database().ref("/study_activity/");
        user.matched = "unmatched";
        ref.child(user.userid).set(user);
        activityRef.child(user.userid + "/" + new Date().yyyymmdd()).update({matched : "unmatched"});
        console.log("Unmatched : " + user.userid);
    }
    
    getUserList(function (user_list) {
        for (var i in user_list) {
            var from = user_list[i];
            if (from.matched == undefined) {
                for (var j in user_list) {
                    var to = user_list[j];
                    //console.log(to);
                    if (to.userid == from.userid || from.gender == to.gender || to.matched != undefined)
                    {
                        if (j == user_list.length - 1) { //No one ever matched
                            setUnMatch(from);
                        }
                        continue;
                    }
                    else {
                        if (isLevelMatchable(from.speaking_level, to.speaking_level)) {
                            from.matched = true;
                            to.matched = true;
                            setMatch(from, to);
                            break;
                        }
                    }
                    if(j == user_list.length-1){ //No one ever matched
                        setUnMatch(from);
                    }   
                }
            }
        }
        if(done != null)
            done();
    });    
}

function isLevelMatchable(fromLevel, toLevel, done){
    switch(fromLevel){
        case "1":
            return (toLevel == 1) || (toLevel == 2) ? true : false; 
        case "2":
            return (toLevel == 1) || (toLevel == 2) ? true : false; 
        case "3":
            return (toLevel == 3) || (toLevel == 4) ? true : false; 
        case "4":
            return (toLevel == 3) || (toLevel == 4) || (toLevel == 5) || (toLevel == 6) ? true : false; 
        case "5":
        case "6":
            return (toLevel == 4) || (toLevel == 5) || (toLevel == 6) || (toLevel == 7) ? true : false; 
        case "7":
            return (toLevel == 5) || (toLevel == 6) || (toLevel == 7) ? true : false; 

        default: return false;
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

function init(){
    //Initial Trigger

    //sendApns(token_list[0], "금일 수업에 참여하시겠습니까?");

    //sendPushAll("금일 스터디에 참여하시겠습니까?", {code : "STUDY_PARTICIPATION", body : "금일 스터디 참석 여부를 알려주세요."});
    //sendPushAll("금일 전화영어에 참여하시겠습니까?", { code: "PHONETALK_PARTICIPATION", body: "하이요" });
    //sendPushAll("금일 전화영어가 매치되었습니다?", { code: "PHONETALK_MATCHED", body: "하이요" });
    minuteInterval2();

    //matchPhoneTalk();
    process.setMaxListeners(0);
    setInterval(minuteInterval2, 60000);
}

init();


module.exports = {
    define : function () {
        console.log("exists");
    },
    addUser: function(userid, name, phoneno, gender, email, speaking_level, pronunciation_level, remained_class) {
        
        var date = new Date().yyyymmdd();
        var user = {
            name : name,
            phoneno : phoneno,
            gender : gender,
            email : email,
            speaking_level : speaking_level,
            pronunciation_level : pronunciation_level,
            registered_date : date,
            remained_class : remained_class,
        }
        var fns = require('./app.js');

        var userRef = fns.firebase.database().ref('/user/' + userid);
        userRef.update(user);
    }
};


Date.prototype.yyyymmdd = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = this.getDate().toString();
    return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" + (dd[1]?dd:"0"+dd[0]); // padding
}
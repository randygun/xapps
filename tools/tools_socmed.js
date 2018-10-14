var instance = this;
var request = require("request");

module.exports.validateFacebook = function(token,callback_ok,callback_nok){
    /*
    {
      "id": "1473942855955152",
      "name": "Nugroho 'ook' Priambodo",
      "email": "facebook@priambodo.org",
      "gender": "male",
      "picture": {
        "data": {
          "is_silhouette": false,
          "url": "https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/11924772_1170247069658067_4823524447552120709_n.jpg?oh=52eedcc522fcde10cca3c14c17295bc3&oe=5865D97E"
        }
      }
    }
    */
	var url = "https://graph.facebook.com/v2.5/me?fields=id,name,email,gender,birthday,picture&access_token="+token;
	request.get({url:url,timeout:30000},function(err,resp,body){
		if(err){
            callback_nok(err);
            return;
        }
        var obj = {};
        try{
            obj = JSON.parse(body);
        }catch(err){
            callback_nok(err);
            return;
        }
        console.log("REPLY: "+body);
        callback_ok({id:obj.id,email:obj.email,name:obj.name,picture:obj.picture.data.url});
	})
};

module.exports.validateGPlus = function(token,callback_ok,callback_nok){
    /*
    {
      "iss": "https://accounts.google.com",
      "aud": "662306946046-r99uqlde9lb2pi7se9n0d7s869sq7gst.apps.googleusercontent.com",
      "sub": "118405550000362925134",
      "email_verified": "true",
      "azp": "662306946046-ja3gr3vveu2hqfsfa853jkfc30g9rc75.apps.googleusercontent.com",
      "hd": "priambodo.org",
      "email": "playstore@priambodo.org",
      "iat": "1476565244",
      "exp": "1476568844",
      "name": "PlayStore Priambodo",
      "picture": "https://lh4.googleusercontent.com/--5uGcjFB2ms/AAAAAAAAAAI/AAAAAAAAAAA/AKTaeK9Z6BYvxPqnmfo0GGthq6EoReSgrQ/s96-c/photo.jpg",
      "given_name": "PlayStore",
      "family_name": "Priambodo",
      "locale": "en",
      "alg": "RS256",
      "kid": "d68b89fdfb3f2b98fe0f815ff7ef5464706ee3d5"
    }
    */
	var url = "https://www.googleapis.com/oauth2/v3/tokeninfo?id_token="+token;
	request.get({url:url,timeout:30000},function(err,resp,body){
		if(err){
            callback_nok(err);
            return;
        }
        var obj = {};
        try{
            obj = JSON.parse(body);
        }catch(err){
            callback_nok(err);
            return;
        }
        callback_ok({id:obj.sub,email:obj.email,name:obj.name,picture:obj.picture});
	})
};
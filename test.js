var ook = "buyer|||s||||sss||||||s|";
console.log("PRE "+ook.replace(/\|+/g, '|').replace(/\|$/g, ''));
console.log("PRE2 "+ook);
var len = ook.length - 1;
var sliced = false;
for(var i=len;i>=0;i--){
	// console.log("APP1");
	if(!sliced){
		// console.log("APP2");
		if(ook[i]==='|') ook = ook.slice(0,-1);
		else sliced = true;
	}
	// console.log("APP3;"+i);
}
console.log("APP4 "+ook);
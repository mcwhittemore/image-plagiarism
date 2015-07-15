var sketchSaver = require("../../lib/sketch-saver");
var co = require("co");
var listOfImages = require("./source-images.json");
var fs = require("fs");
var path = require("path");
var getPixels = require("get-pixels");
var savePixels = require("save-pixels");

var getBasePixels = function*(imgPath){
	return new Promise(function(accept, reject){
		getPixels(imgPath, function(err, pixels) {
			if(err) {
				reject(err);
			}
			else{
				accept(pixels);
			}
		});
	});
}

var getPath = function(imgId){
	return path.join(__dirname, "../../instagrams", imgId+".jpg");
}

var diff = function(img, x1, y1, x2, y2){
	var red = Math.abs(img.get(x1, y1, 0) - img.get(x2, y2, 0));
	var green = Math.abs(img.get(x1, y1, 1) - img.get(x2, y2, 1));
	var blue = Math.abs(img.get(x1, y1, 2) - img.get(x2, y2, 2));
	return red + green + blue;
}

var changes = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1]
]

var max = 640 * 640;
var unit = Math.floor(max / 100);

var getRoute = function(img, x, y){
	var allDiffs = [];
	var route = [];
	var pending = [];
	var last = 0;
	var count = 0;

	do{
		var diffs = [];
		for(var i=0; i<changes.length; i++){
			var iii = pending.indexOf(x+"-"+y);
			if(iii>-1){
				pending = pending.splice(iii, 1);
			}
			var c = changes[i];
			var x2 = x + c[0];
			var y2 = y + c[1];
			var key = x2+"-"+y2;
			if(x2>-1 && x2 < 640 && y2 > -1 && y2 < 640 && pending.indexOf(key) == -1){
				pending.push(key);
				var d = diff(img, x, y, x2, y2);
				diffs.push({
					x: x2,
					y: y2,
					val: d,
					key: key
				});
			}
		}

		if(diffs.length > 0){
			diffs.sort(function(a, b){
				return a.val - b.val;
			});

			allDiffs.push(diffs);
		}

		for(var i=allDiffs.length-1; i>-1; i--){
			var diff = allDiffs[i];
			if(diff.length === 0){
				allDiffs = allDiffs.splice(i);
			}
			else{
				route.push(diff[0].key);
				x = diff[0].x;
				y = diff[0].y;
				allDiffs[i] = diff.splice(0);
				break;
			}
		}

		count++;

		if(count >= last+unit){
			console.log((100/max)*count, "%", allDiffs.length);
			last = count;
		}

	} while(allDiffs.length > 0);

	return route;
}

co(function*(){

	var routes = [];

	for(var i=0; i<listOfImages.length; i++){
		var imgId = listOfImages[i];
		var img = yield getBasePixels(getPath(imgId));
		var route = getRoute(img, 320, 320);
		routes.push(route);
	}

	console.log(routes);

}).then(sketchSaver).catch(function(err){
	console.log(err.stack);
	sketchSaver();
});
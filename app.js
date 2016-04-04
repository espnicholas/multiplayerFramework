var util = require('util');
var filter = require('bad-words');
var list = require('badwords-list');
var THREE = require('three');
var CANNON = require('cannon');
//var goblin = require('goblinphysics');
var http = require('http');
var express = require('express');
var session = require('express-session');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var mongoose = require('mongoose');

var terrain = require('./server/terrain');
var AM = require('./server/account-manager');
var EM = require('./server/email-dispatcher');
var phys = require('./server/phys');

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);


var router = express.Router();
router.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT, GET,POST");
	next();
});

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//url: 'mongodb://localhost/character-login:27017'
//mongoose.connect('mongodb://localhost/character-login');
app.set('port', 8100);
//app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));
require('./server/routes')(app);

server.listen(8100);
console.log("Multiplayer app listening on port 8100");
var logReset = 0;











function gameServer() {
	this.border = { // Vanilla border values are - top: 0, left: 0, right: 111180.3398875, bottom: 11180.3398875,
		xMin: -50000, // Backwards/Forwards
		xMax: 50000, // Backwards/Forwards
		yMin: -50000, // Left/Right
		yMax: 50000, // Left/Right
		zMin: -100000, // Up/Down
		zMax: 100000 // Up/Down
	}; // Foward: X increases, Right: Y increases, Up: Z decreases
	//      | Z
	//      |______    inside of corner of cube
	//     /      X
	//    / Y
	this.filter = new filter();
	//this.filter.addWords(['a$$']);
	this.clients = [];
	this.characters = [];
	this.locations = {};
	this.playersOnline = 0;
	this.map = [];
	this.lastId = 0;
	this.config = {};
	this.t = {};
	this.t.scene = new THREE.Scene();
	this.c = {};
	this.c.pw = new CANNON.World();
	this.c.objects = [];
	this.c.pw.gravity.set(0, 0, -10);
	this.c.pw.broadphase = new CANNON.SAPBroadphase(this.c.pw);
	this.c.pw.solver.iterations = 10;
	this.c.pw.defaultContactMaterial.friction = 0.1;
	this.c.pw.defaultContactMaterial.restitution = 0;
};

gameServer.prototype.createPhysicsObject = function(phys) {
	//var pObject = {};
	//pObject.phys = phys;
	
	//this.c.objects.push(pObject);
	this.c.pw.addBody(phys);
};




/* CREATE PLAYER */
/*gameServer.prototype.createPlayer = function() {

	var cylinder = {
		height: 3.2,
		radius: 1
	};
	var cylinderShape = new CANNON.Cylinder(cylinder.radius, cylinder.radius, cylinder.height, 16);
	var sphereShape = new CANNON.Sphere(cylinder.radius);
	var tempBody = new CANNON.Body({
		mass: 1
	});
	tempBody.addShape(cylinderShape);
	tempBody.addShape(sphereShape, new CANNON.Vec3(0, 0, cylinder.height/2));
	tempBody.addShape(sphereShape, new CANNON.Vec3(0, 0, -cylinder.height/2));
	tempBody.angularDamping = 1;
	tempBody.position.set(0, 0, 100);

	var pObject = {};
	pObject.phys = tempBody;

	var length = this.c.objects.length;
	this.c.objects.push(pObject);
	this.c.pw.addBody(pObject.phys);
	return pObject.phys;
};*/





/* CREATE ENEMY */
/*gameServer.prototype.createEnemyPhys = function(shape) {
	var that = this;
	var createCollider;
	switch(shape) {
		case "capsule":
			createCollider = function(radius, height, isRotated) {
				var cylinderShape = new CANNON.Cylinder(radius, radius, height, 16);
				var sphereShape = new CANNON.Sphere(radius);
				var tempBody = new CANNON.Body({
					mass: 1
				});
				
				// CHANGE LATER
				if(!isRotated || isRotated) {
					tempBody.addShape(cylinderShape);
					tempBody.addShape(sphereShape, new CANNON.Vec3(0, 0, height/2));
					tempBody.addShape(sphereShape, new CANNON.Vec3(0, 0, -height/2));
				} else if(isRotated) {
					// TODO
				}
				
				tempBody.angularDamping = 1;
				
				var testObject = {};
				testObject.phys = tempBody;
				
				var length = that.c.objects.length;
				that.c.objects.push(testObject);
				that.c.pw.addBody(that.c.objects[length].phys);
				return that.c.objects[length].phys;
			};
			break;
		case "box":
			
			break;
		
		case "sphere":
			
			break;
			
	}
	return createCollider;
};*/

gameServer.prototype.initScene = function() {
	terrain.physicsFromHeightmap(__dirname + "/public/assets/models/environment/terrain/area1/test.png", function(phys) {
		var terrain2 = gs.createPhysicsObject(phys);
		//console.log(hfBody);
	});
	//var randName = "blob"+Math.floor(Math.random()*5000);
	//var newCharacter = new abababe(10, 1000, randName);
	//newCharacter.position.set(0, 0, 0);
	//gs.characters.push(newCharacter);
};

gameServer.prototype.updatePhysics = function() {
	this.c.pw.step(1 / 60);
	/*for (var i = 0; i < this.c.objects.length; i++) {
		if (typeof this.c.objects[i].update != "undefined") {
			this.c.objects[i].update();
		}
	}*/
};


gameServer.prototype.findPlayerByName = function(username) {
	for (var i = 0; i < this.characters.length; i++) {
		if (this.characters[i].username == username) {
			return this.characters[i];
		}
	}
	return null;
};



function character() {
	this.online = false;

	// Viewing box
	this.sightRange = 1200; //change sightrange later should be 0 at start
	this.viewBox = {
		xMin: 0, // Left/Right
		xMax: 0, // Left/Right
		yMin: 0, // Up/Down
		yMax: 0, // Up/Down
		zMin: 0, // Backwards/Forwards
		zMax: 0 // Backwards/Forwards
	};
}
character.prototype.collisionCheck = function(xMin, xMax, yMin, yMax, zMin, zMax) {
	// Coll	jision checking
	var obj;
	if (true) {
		obj = this.phys;
	}
	if (obj.position.x < xMin) {
		return false;
	}
	if (obj.position.x > xMax) {
		return false;
	}
	if (obj.position.y < yMin) {
		return false;
	}
	if (obj.position.y > yMax) {
		return false;
	}
	if (obj.position.z < zMin) {
		return false;
	}
	if (obj.position.z > zMax) {
		return false;
	}
	return true;
};


function spell(name, castTime) {
	this.name = name;
	this.castTime = castTime;
}






function player(owner, username, classType) {
	character.call(this);
	
	if(classType) {
		this.class = classType;
	} else {
		this.class = "wizard";
	}

	this.type = "player";
	this.owner = owner;
	this.id = this.owner.socketId;
	this.keys = this.owner.keys;
	this.data = this.owner.data;
	
	this.username = username;
	if(this.owner.usernames.indexOf(this.username) == -1) {
		this.owner.usernames.push(this.username);
	}


	this.temp = {
		inputVelocity: new THREE.Vector3(),
		helper: new THREE.Object3D(),
		isJumping: false,
		isGrounded: false
	};

	this.phys = phys.createPhysBody("capsule")(1, 3.2);
	gs.c.pw.addBody(this.phys);
	
	this.phys.username = this.username;
	this.position = this.phys.position;
	this.quaternion = this.phys.quaternion;
	this.velocity = this.phys.velocity;
	this.rotation2 = function(){
		return this.owner.data.rotation;	
	};
	this.score = 0;
	this.health = 100;
	this.level = 0;
	this.experience = 0;
	this.target = 0;
	this.cooldowns = {};
	this.cooldowns.globalCooldown = 0;
	this.animTo = "idle";
	this.warpTime = 0.2;
	this.casting = "none";
	this.castStart = 0;
	this.spells = [];

	this.load = function(savedCharacter) {
		var sn = savedCharacter;
		this.class = sn.class;
		this.username = sn.username;
		if(typeof sn.position != "undefined") {
			this.position.set(sn.position.x, sn.position.y, sn.position.z + 10);
		}
		if(typeof sn.velocity != "undefined") {
			this.velocity.set(sn.velocity.x, sn.velocity.y, sn.velocity.z);
		}
		this.score = sn.score;
		this.health = sn.health;
		this.level = sn.level;
		this.experience = sn.experience;
	}
}
player.prototype = Object.create(character.prototype);
player.prototype.constructor = player;


player.prototype.viewObj = function() {
	return {
		type: this.type,
		class: this.class,
		position: this.position,
		velocity: this.velocity,
		quaternion: this.quaternion,
		rotation2: this.rotation2(),
		username: this.username,
		score: this.score,
		health: this.health,
		level: this.level,
		experience: this.experience,
		cooldowns: this.cooldowns,
		animTo: this.animTo,
		warpTime: this.warpTime,
	};
};

player.prototype.saveObj = function() {
	return {
		type: this.type,
		class: this.class,
		position: this.position,
		velocity: this.velocity,
		quaternion: this.quaternion,
		rotation2: this.rotation2,
		username: this.username,
		score: this.score,
		health: this.health,
		level: this.level,
		experience: this.experience
	};
};





player.prototype.takeDamage = function(amount, shooter) {
	if (shooter) {
		shooter.gainXP(1);
	}
	this.health -= amount;
	if (this.health < 0) {
		if (shooter) {
			shooter.gainXP(9);
		}
		this.phys.position.set(0, 0, 0);
		this.health = 100;
	}
};

player.prototype.gainXP = function(amount) {
	this.experience += amount;
	if (this.experience > 100 * this.level) {
		this.experience = 0;
		this.level += 1;
		io.emit('level up', {
			user: this.username
		});
	}
};

player.prototype.checkCooldowns = function() {
	for (var i in this.cooldowns) {
		if (this.cooldowns[i] > 0) {
			this.cooldowns[i] -= 60;
		}
	}
};


player.prototype.cast = function(spellName) {
	if (typeof this.spells[spellName] != "undefined") {
		//this.spells[spellName]
	}
};

player.prototype.move = function() {
	var data = this.owner.data;
	var keys = this.owner.keys;
	var rotation = this.owner.data.rotation || new THREE.Vector3();

	this.checkCooldowns();

	this.temp.inputVelocity.set(0, 0, 0);
	if (keys.indexOf("moveForward") > -1 && this.temp.isGrounded == true) {
		this.animTo = "walking_inPlace";
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z);
		if (rotatedV.x > 0) {
			this.temp.inputVelocity.x = -rotatedV.x;
		} else {
			this.temp.inputVelocity.x = -20;
		}
	}
	if (keys.indexOf("moveBackward") > -1 && this.temp.isGrounded == true) {
		this.animTo = "walking_inPlace";
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z);
		if (rotatedV.x < 0) {
			this.temp.inputVelocity.x = -rotatedV.x;
		} else {
			this.temp.inputVelocity.x = 20;
		}
	}
	if (keys.indexOf("moveLeft") > -1 && this.temp.isGrounded == true) {
		this.animTo = "left_strafe_walking_inPlace";
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z);
		if (rotatedV.y > 0) {
			this.temp.inputVelocity.y = -rotatedV.y;
		} else {
			this.temp.inputVelocity.y = -20;
		}
	}
	if (keys.indexOf("moveRight") > -1 && this.temp.isGrounded == true) {
		this.animTo = "right_strafe_walking_inPlace";
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z);
		if (rotatedV.y < 0) {
			this.temp.inputVelocity.y = -rotatedV.y;
		} else {
			this.temp.inputVelocity.y = 20;
		}
	}

	if (keys.indexOf("moveForward") == -1 && keys.indexOf("moveBackward") == -1 && this.temp.isGrounded == true) {
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z).multiplyScalar(0.1);
		this.temp.inputVelocity.x = -rotatedV.x;
	}
	if (keys.indexOf("moveLeft") == -1 && keys.indexOf("moveRight") == -1 && this.temp.isGrounded == true) {
		var rotatedV = new THREE.Vector3().copy(this.phys.velocity).applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotation.z).multiplyScalar(0.1);
		this.temp.inputVelocity.y = -rotatedV.y;
	}
	
	if (data.target) {
		this.target = data.target;
	}
	
	if(data.cast) {
		if(typeof this.spells[data.cast] != "undefined" && this.casting == "none") {
			this.casting = data.cast;
			this.castStart = Date.now();
			//this.cast(data.cast);
		}
	}
	if(this.casting != "none") {
		this.cast(this.casting);
	}

	/*if (keys.indexOf("castFireball") > -1 && this.target != null && this.cooldowns.globalCooldown === 0) {
		this.animTo = "fireball";
		this.cooldowns.globalCooldown = 60 * 10;

		var playerCharacter = gs.findPlayerByName(this.target);
		if (playerCharacter != null) {
			playerCharacter.takeDamage(5, this);
		}
	}*/



	this.temp.inputVelocity.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation.z);
	if (this.temp.isGrounded === true) {
		this.phys.velocity.x = this.temp.inputVelocity.x;
		this.phys.velocity.y = this.temp.inputVelocity.y;
		//this.phys.velocity.z = 0;
		this.phys.applyLocalForce(new CANNON.Vec3(0, 0, 10), new CANNON.Vec3(0, 0, 0));
	}
	


	var px = Math.pow(this.phys.velocity.x, 2);
	var py = Math.pow(this.phys.velocity.y, 2);
	var pz = Math.sqrt(px + py);
	if (pz < 0.3 && (this.animTo == "walking_inPlace" || this.animTo == "left_strafe_walking_inPlace" || this.animTo == "right_strafe_walking_inPlace")) {
		this.animTo = "idle";
	}

	var pVec1 = new CANNON.Vec3().copy(this.phys.position).vadd(new CANNON.Vec3(0, 0, -2.7));
	
	var pVec2 = pVec1.vsub(new CANNON.Vec3(0, 0, 800));
	var result = new CANNON.RaycastResult();
	gs.c.pw.raycastAny(pVec1, pVec2, {}, result);
	if (result.hasHit) {
		var hitPoint1 = new THREE.Vector3().copy(result.hitPointWorld);
		if(result.distance < 1 && this.temp.isJumping === false) {
			this.phys.position.z += 0.01 - result.distance;
		}
		if (result.distance < 0.1) {
			this.temp.isGrounded = true;
		} else {
			this.temp.isGrounded = false;
		}
	} else {
		this.phys.position.z += 0.1;
	}
	
	if (keys.indexOf("jump") > -1 && this.temp.isGrounded === true && this.temp.isJumping === false) {
		this.animTo = "jump";
		this.gainXP(10);
		//this.score += 1;
		this.temp.isJumping = true;
		this.phys.applyLocalImpulse(new CANNON.Vec3(0, 0, 50), new CANNON.Vec3(0, 0, 0));
		//this.phys.position.z += 0.5;
	}
	
	
	if (keys.indexOf("jump") == -1 && this.temp.isGrounded === true) {
		this.temp.isJumping = false;
	}
	
};

/*function enemy(level, health, name) {
	character.call(this);
	this.type = "enemy";
	this.class = "enemy";
	this.username = "blob"+Math.floor(Math.random()*5000);

	this.rotation2 = new CANNON.Vec3(0, 0, 0);
	this.health = health;
	this.level = level;
	this.animTo = "idle";
	this.warpTime = 0.2;
}
enemy.prototype = Object.create(character.prototype); // See note below
enemy.prototype.constructor = enemy;


enemy.prototype.viewObj = function() {
	return {
		type: this.type,
		which: this.which,
		position: this.position,
		velocity: this.velocity,
		quaternion: this.quaternion,
		rotation2: this.rotation2,
		characterId: this.characterId,
		username: this.username,
		health: this.health,
		level: this.level,
		animTo: this.animTo,
		warpTime: this.warpTime,
	};
};

enemy.prototype.saveObj = function() {
	return {
		type: this.type,
		position: this.position,
		velocity: this.velocity,
		quaternion: this.quaternion,
		rotation2: this.rotation2,
		characterId: this.characterId,
		username: this.username,
		health: this.health,
		level: this.level,
	};
};





function rInt(min, max, isSignRandom, roundNum) {
	var num;
	if(roundNum) {
		num = Math.floor(Math.random() * (max - min + 1) + min);
	} else {
		num = Math.random() * (max - min + 1) + min;
	}
	if(isSignRandom) {
		var plusOrMinus = Math.round(Math.random()) * 2 - 1;
		var final = num*plusOrMinus;
		return final;
	} else {
		return num;
	}
}

var rMove = function(num) {
	return rInt(0, num, true, false);
}

enemy.prototype.move = function() {
		this.phys.applyLocalImpulse(new CANNON.Vec3(rMove(1), rMove(1), rMove(0.2)), new CANNON.Vec3(0, 0, 0));
};*/

function client(id) {
	this.isOnline = false;
	this.socketId = id;
	this.visibleCharacters = [];
	this.username = "";
	this.accountName = "";
	this.usernames = [];
	this.characters = [];

	this.getCharacter = function(num) {
		return this.characters[this.usernames[num]];
	};

	this.keys = [];
	this.data = {};
	this.score = 0;

	this.mouseX = 0;
	this.mouseY = 0;
}

character.prototype.update = function() {

	// Get visible characters
	this.previouslyVisibleCharacters = this.visibleCharacters;
	this.visibleCharacters = this.calcViewBox();
	io.to(this.id).emit('visibleCharacters', {
		vn: this.visibleCharacters
	});
};


character.prototype.calcViewBox = function() {
	var pos = this.position;
	
	this.viewBox.xMin = pos.x - this.sightRange;
	this.viewBox.xMax = pos.x + this.sightRange;
	this.viewBox.yMin = pos.y - this.sightRange;
	this.viewBox.yMax = pos.y + this.sightRange;
	this.viewBox.zMin = pos.z - this.sightRange;
	this.viewBox.zMax = pos.z + this.sightRange;

	var newVisible = [];
	for (var i = 0; i < gs.characters.length; i++) {
		var character1 = gs.characters[i];
		
		if (character1.collisionCheck(this.viewBox.xMin, this.viewBox.xMax, this.viewBox.yMin, this.viewBox.yMax, this.viewBox.zMin, this.viewBox.zMax)) {
			newVisible.push(character1.viewObj());
		}
	}
	return newVisible;
};


var gameServer1 = new gameServer();
var gs = gameServer1;
gs.initScene();

io.on('connection', function(socket) {

	var newClient = new client(socket.id);

	gs.clients[socket.id] = newClient;
	gs.map.push(socket.id);
	console.log("connected id: " + socket.id);
	console.log("gs.map.length: " + gs.map.length);
	
	
	
	socket.on('autoLogin', function(data) {
		
		
		
		
	});
	
	socket.on('joinWorld', function(data) {
		if(gs.clients[socket.id].loggedIn === true) {
			
		}
	});
	
	
	
	socket.on('addUser', function(data) {
		
		
		
		
	});
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

	/*socket.on('disconnect', function() {
		var i;

		//ADDED
		var clcharacters = gs.clients[socket.id].characters;
		var usernames = gs.clients[socket.id].usernames;

		var tcharacters = [];
		for (i = 0; i < usernames.length; i++) {
			var clcharacter2 = gs.clients[socket.id].getCharacter(i);
			tcharacters.push(clcharacter2.saveObj());
			
			io.emit('numOfPlayersOnline', gs.playersOnline);
			gs.c.pw.removeBody(clcharacter2.phys);
			
			if (i == usernames.length && gs.clients[socket.id].username.indexOf("guest") == -1) {
				var data = {
					user: gs.clients[socket.id].username,
					characters: tcharacters
				};

				AM.addData(data, function(e, o) {
				});
			}
		}
		
		
		//END OF ADDED

		delete gs.clients[socket.id];
		gs.map.splice(gs.map.indexOf(socket.id), 1);

		console.log("disconnected id: " + socket.id);
		console.log("gs.characters.length: " + gs.characters.length);
		console.log("gs.map.length: " + gs.map.length);
		console.log("gs.clients.length: " + gs.clients.length);
	});*/
	
	/*socket.on('addUser', function(data) {
		gs.playersOnline += 1;
		io.emit('numOfPlayersOnline', gs.playersOnline);

		if (data.user == 'guest') {
			var user = "guest" + Math.floor(Math.random() * 10000);
			var charName = user;

			socket.on('chat message', function(msg) {
				io.emit('chat message', {
					msg: gs.filter.clean(msg),
					name: gs.filter.clean(user)
				});
			});

			gs.clients[socket.id].username = gs.filter.clean(user);
			gs.clients[socket.id].isOnline = true;
			
			if(data.class == "wizard" || data.class == "paladin" || data.class == "rogue") {
				
			
				var newCharacter = new player(gs.clients[socket.id], charName, data.class);
				
				gs.clients[socket.id].characters[charName] = newCharacter;
				gs.characters.push(newCharacter);
				
				socket.emit('initData', {
					username: gs.filter.clean(charName),
				});
				
			}


		} else {

			var user = data.user;
			var pass = data.pass;
			var character = data.character;

			AM.autoLogin(user, pass, function(o) {
				if (!o || typeof o.characters[character] == "undefined") {
					socket.emit('notLoggedIn');
				} else if (typeof o != "undefined") {

					socket.on('chat message', function(msg) {
						io.emit('chat message', {
							msg: gs.filter.clean(msg),
							name: gs.filter.clean(character)
						});
					});
					gs.clients[socket.id].username = gs.filter.clean(o.user);
					gs.clients[socket.id].isOnline = true;
					
					var newCharacter = new player(gs.clients[socket.id], character, o.characters[character].class);
					newCharacter.load(o.characters[character]);
					
					gs.clients[socket.id].characters[character] = newCharacter;
					gs.characters.push(newCharacter);
					socket.emit('initData', {
						username: gs.filter.clean(character),
					});
				}
			});
		}
	});*/



	socket.on('input', function(data) {
		var keys = data.keys;
		var sentData = data.data;
		gs.clients[socket.id].keys = keys;
		gs.clients[socket.id].data = sentData;
	});

	socket.on('getNumOfPlayersOnline', function(data) {
		socket.emit('playersOnline', gs.playersOnline);
	});
});


function loop() {
	for (var i = 0; i < gs.characters.length; i++) {
		if(gs.characters[i].type == "player" && typeof gs.clients[gs.characters[i].id] == "undefined") {
			gs.characters.splice(i, 1);
			console.log("character deleted");
			continue;
		}
		
		var character1 = gs.characters[i];
		character1.move();
	}
	
	for (var j = 0; j < gs.characters.length; j++) {
		if(gs.characters[j].type == "player") {
			gs.characters[j].update();
		}
	}

	gs.updatePhysics();

	if (logReset <= 200) {
		logReset += 1;
	} else if (logReset > 200) {
		logReset = 0;
	}
	setTimeout(loop, 1000/60);
}
setTimeout(loop, 2000);
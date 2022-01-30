const RUMYES = new Image();
RUMYES.src = "/images/rum-yes.png";
const RUMNO = new Image();
RUMNO.src = "/images/rum-no.png";
const BOATRIGHT = new Image();
BOATRIGHT.src = "/images/boat-right.png";
const BOATLEFT = new Image();
BOATLEFT.src = "/images/boat-left.png";
var BACKGROUND = new Image();
BACKGROUND.src = "/images/1.jpg ";

class Boat {
    constructor(width, height, color, x, y, name, id = "", socket) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.speedX = 0;
        this.speedY = 0;
        this.x = x;
        this.y = y;
        this.id = id;
        this.name = name;
        this.dead = false;
        this.socket = socket;
        this.face = "right";
    }
    update(gameArea) {
        if (this.dead) {
            return false
        }
        var img;
        if (this.face == "right") {
            img = BOATRIGHT;
        }
        if (this.face == "left") {
            img = BOATLEFT;
        }
        gameArea.context.drawImage(img, this.x, this.y, this.width, this.height);
        // ajout du nom
        let fontSize = Math.min(this.width, this.height) / 3;
        gameArea.context.font = fontSize + "px Arial";
        gameArea.context.fillStyle = "white";
        gameArea.context.fillText(this.name, this.x, this.y - fontSize);
        return true;
    }
    newPos() {
        if (this.speedX > 0) {
            this.face = "right";
        } else if (this.speedX < 0) {
            this.face = "left";
        }
        this.x += this.speedX;
        this.y += this.speedY;
    }
    remove() {
        this.dead = true;
    }

    async sync() {
        var self = this;

        self.socket.on("dead", (data) => {
            if (data.id == self.id) {
                self.remove();
            }
        })
        self.socket.on("win", (data) => {
            if (data.id == self.id) {
                self.width = data.width;
                self.height = data.height;
            }
        })
    }
    async sync_move() {
        var self = this
        self.socket.on('move', (data) => {
            if (data.id == self.id) {
                if (data.speedX > 0) {
                    self.face = "right";
                } else if (data.speedX < 0) {
                    self.face = "left";
                }
                self.x = data.x;
                self.y = data.y;
            }
        })
    }
}
class Feed {
    constructor(x, y, id, socket) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.removed = false;
        this.socket = socket;
    }
    update(gameAera) {
        if (this.removed) {
            return false
        }
        // image 10x10

        gameAera.context.drawImage(RUMYES, this.x, this.y, 30, 30);
        return true
    }
    remove() {
        this.removed = true;
    }
    async sync() {
        var self = this;
        self.socket.on("eat", (data) => {
            if (data.id == self.id) {
                self.remove();
            }
        })
    }
}

class Poison {
    constructor(x, y, id, socket) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.removed = false;
        this.socket = socket;
    }
    update(gameAera) {
        if (this.removed) {
            return false
        }
        // image 10x10

        gameAera.context.drawImage(RUMNO, this.x, this.y, 30, 30);
        return true
    }
    remove() {
        this.removed = true;
    }
    async sync() {
        var self = this;
        self.socket.on("eat", (data) => {
            if (data.id == self.id) {
                self.remove();
            }
        })
    }
}


class Game {
    constructor(socket, username) {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.map = {
            width: 1500,
            height: 1500
        }
        this.canvas.width = this.map.width;
        this.canvas.height = this.map.height;
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.socket = socket
        this.keys = [];
        this.myBoat;
        this.username = username;
        this.otherBoats = [];
        this.feeds = [];
        this.poisons = [];
        this.camera = {
            x: 0,
            y: 0
        }

    }
    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return
    }
    start() {
        var self = this;
        self.interval = setInterval(() => {
            self.updateGameArea();
        }, 20);
        window.addEventListener('keydown', function (e) {
            self.keys = (self.keys || []);
            self.keys[e.keyCode] = true;
        })
        window.addEventListener('keyup', function (e) {
            self.keys = (self.keys || []);
            self.keys[e.keyCode] = false;
        })
        // screen touch
        // window.addEventListener('touchmove', function (e) {

    }
    gameOver() {
        clearInterval(this.interval);
        let replay_div = document.createElement("div");
        replay_div.classList.add("replay");
        replay_div.innerHTML = "Vous avez perdu..</br>";
        let btn = document.createElement("button");
        btn.innerHTML = "Rejouer";
        btn.addEventListener("click", () => {
            window.location.reload();
        })
        replay_div.appendChild(btn);
        document.body.appendChild(replay_div);

    }
    updateGameArea() {
        var self = this;
        self.clear();
        self.setZoomToBoat(self.myBoat)
        self.clear();
        self.background()
        var speed = 0;
        self.myBoat.speedX = 0;
        self.myBoat.speedY = 0;
        var size = (self.myBoat.width + self.myBoat.height);
        speed = 30 * 1/size 
        if (self.keys && self.keys[37]) { self.myBoat.speedX = -(speed) }
        if (self.keys && self.keys[39]) { self.myBoat.speedX = (speed) }
        if (self.keys && self.keys[38]) { self.myBoat.speedY = -(speed) }
        if (self.keys && self.keys[40]) { self.myBoat.speedY = (speed) }
        self.myBoat.newPos();

        if (self.myBoat.speedX != 0 || self.myBoat.speedY != 0) {
            // On vérifie si on est toujours sur la carte
            if (self.myBoat.x < 0) {
                self.myBoat.x = 0;
            }
            if (self.myBoat.x + self.myBoat.width > self.map.width) {
                self.myBoat.x = self.map.width - self.myBoat.width;
            }
            if (self.myBoat.y < 0) {
                self.myBoat.y = 0;
            }
            if (self.myBoat.y + self.myBoat.height > self.map.height) {
                self.myBoat.y = self.map.height - self.myBoat.height;
            }

            self.socket.emit('move', {
                x: self.myBoat.x,
                y: self.myBoat.y,
                speedX: self.myBoat.speedX,
                speedY: self.myBoat.speedY,
            });
        }
        // zoom in and out with size and position



        if (!self.myBoat.update(self)) {
            self.gameOver();
        }
        self.otherBoats.sort(function (a, b) {
            return (b.width + b.height) - (a.width + a.height);
        });
        for (var i = 0; i < self.otherBoats.length; i++) {
            if (!self.otherBoats[i].update(self)) {
                self.otherBoats.splice(i, 1)
            }
        }
        for (var i = 0; i < self.feeds.length; i++) {
            if (!self.feeds[i].update(self)) {
                self.feeds.splice(i, 1)
            }
        }
        for (var i = 0; i < self.poisons.length; i++) {
            if (!self.poisons[i].update(self)) {
                self.poisons.splice(i, 1)
            }
        }
    }
    setZoomToBoat(boat) {
        // follow the boat

        this.context.resetTransform();
        // map is 2000x2000
       
        // if boat is out od the screen
        if (boat.x < window.innerWidth - boat.width) {
            this.camera.x = boat.x *1.5 - window.innerWidth / 2 + boat.width / 2;
        }
        if (boat.x > window.innerWidth - boat.width) {
            this.camera.x = boat.x *1.5 - window.innerWidth / 2 + boat.width / 2;
        }
        if (boat.y < window.innerHeight - boat.height) {
            this.camera.y = boat.y *1.5 - window.innerHeight / 2 + boat.height / 2;
        }
        if (boat.y > window.innerHeight - boat.height) {
            this.camera.y = boat.y *1.5 - window.innerHeight / 2 + boat.height / 2;
        }

        
        this.context.translate(-this.camera.x, -this.camera.y)
        this.context.scale(1.5, 1.5);



    }
    background() {
        var self = this;
        // set image background BACKGROUND
        // crop the image to the size of the canvas

        // don't resize the image, just crop it
        var pattern = self.context.createPattern(BACKGROUND, 'repeat');
        self.context.fillStyle = pattern;
        self.context.fillRect(0, 0, self.canvas.width, self.canvas.height);



    }
    startGame() {
        var self = this;
        self.myBoat = new Boat(30, 30, "red", 10, 200 * Math.random(), self.username, self.socket.id, self.socket);
        self.myBoat.sync();
        self.socket.emit('join', {
            width: self.myBoat.width,
            height: self.myBoat.height,
            x: self.myBoat.x,
            y: self.myBoat.y,
            color: self.myBoat.color,
            name: self.myBoat.name,
            id: self.socket.id
        });

        self.socket.on("joined", function (data) {
            if (data.id == self.socket.id) return
            if (self.otherBoats[data.id] == null) {
                var b = new Boat(data.width, data.height, data.color, data.x, data.y, data.name, data.id, self.socket)
                self.otherBoats.push(b);
                console.log(b.name + " joined");
                b.sync()
                b.sync_move()
            }
        });

        self.socket.on("feed", function (data) {
            if (self.feeds[data.id] == null) {
                var f = new Feed(data.x, data.y, data.id, self.socket);
                self.feeds.push(f);
                f.sync()
            }
        });

        self.socket.on("poison", function (data) {
            if (self.poisons[data.id] == null) {
                var p = new Poison(data.x, data.y, data.id, self.socket);
                self.poisons.push(p);
                p.sync()
            }
        });

        fetch("/init").then(res => res.json()).then(data => {
            data.feeds.forEach(f => {
                if (self.feeds[f.id] == null) {
                    var feed = new Feed(f.x, f.y, f.id, self.socket);
                    self.feeds.push(feed);
                    feed.sync()
                }
            })
            data.poisons.forEach(p => {
                if (self.poisons[p.id] == null) {
                    var poison = new Poison(p.x, p.y, p.id, self.socket);
                    self.poisons.push(poison);
                    poison.sync()
                }
            })

            for (const [key, value] of Object.entries(data.boats)) {
                if (self.otherBoats[key] == null && key != self.socket.id) {
                    var b = new Boat(value.width, value.height, value.color, value.x, value.y, value.name, key, self.socket);
                    self.otherBoats.push(b);
                    console.log(b.name + " joined");
                    b.sync()
                    b.sync_move()
                }
            }
            document.body.style.backgroundImage = "url(" + data.background + ")";
            var audio = new Audio('/musique/main.mp3');
            audio.loop = true;
            audio.play();



        });
        self.socket.on("update_background_image", (data) => {
            document.body.style.backgroundImage = "url(" + data.image + ")";
            BACKGROUND = new Image();
            BACKGROUND.src = data.image;

        })

        self.socket.on("update_score", (data) => {
            document.getElementById('score').innerText = ""
            for (var i = 0; i < data.score.length; i++) {
                let name = data.score[i].name;
                let score = data.score[i].score;

                document.getElementById('score').innerText += "#" + (i + 1) + " - " + name + " : " + score + "\n";
            }
        })

        this.start();

    }

}


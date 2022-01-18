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
        var img = new Image();
        if (this.face == "right") {
            img.src = "/images/boat-right.png";
        }
        if (this.face == "left") {
            img.src = "/images/boat-left.png";
        }
        gameArea.context.drawImage(img, this.x, this.y, this.width, this.height);
        // ajout du nom
        let fontSize = Math.min(this.width, this.height) / 3;
        gameArea.context.font = fontSize + "px Arial";
        gameArea.context.fillStyle = "white";
        gameArea.context.fillText(this.name, this.x + 5, this.y - fontSize);
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
        var img = new Image();
        img.src = "/images/rum-yes.png";
        gameAera.context.drawImage(img, this.x, this.y, 30, 30);
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
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.socket = socket
        this.keys = [];
        this.myBoat;
        this.username = username;
        this.otherBoats = [];
        this.feeds = [];
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
        self.myBoat.speedX = 0;
        self.myBoat.speedY = 0;
        var speed = ((self.myBoat.width + self.myBoat.height) / 500);
        if (speed > .80) speed = 0.80;
        if (self.keys && self.keys[37]) { self.myBoat.speedX = -1 + speed }
        if (self.keys && self.keys[39]) { self.myBoat.speedX = 1 - speed }
        if (self.keys && self.keys[38]) { self.myBoat.speedY = -1 + speed }
        if (self.keys && self.keys[40]) { self.myBoat.speedY = 1 - speed }
        self.myBoat.newPos();

        if (self.myBoat.speedX != 0 || self.myBoat.speedY != 0) {
            self.socket.emit('move', {
                x: self.myBoat.x,
                y: self.myBoat.y,
                speedX: self.myBoat.speedX,
                speedY: self.myBoat.speedY,
            });
        }


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

        self.socket.on("removed", function (id) {
            for (var i = 0; i < self.otherBoats.length; i++) {
                if (self.otherBoats[i].id == id) {
                    self.otherBoats[i].remove();
                    console.log(self.otherBoats[i].name + " left");
                    self.otherBoats.splice(i, 1);
                    break;
                }
            }
        });
        self.socket.on("feed", function (data) {
            if (self.feeds[data.id] == null) {
                var f = new Feed(data.x, data.y, data.id, self.socket);
                self.feeds.push(f);
                f.sync()
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

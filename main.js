const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// ajout de socket.io
const server = require('http').Server(app)
const io = require('socket.io')(server)


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.get('/', function (req, res) {
   res.sendFile('public/index.html', { root: __dirname })
})

const MAP = {
   width: 1500,
   height: 1500
}

function rnd_background() {
   return "/images/" + (Math.floor(Math.random() * 5) + 1) + ".jpg"
}
var current_background = rnd_background()
// serv static files at /images
app.use('/images', express.static('public/images'))
app.use('/musique', express.static('public/musique'))
app.use('/js', express.static('public/js'))
var boats_name = [
   "Pierre",
   "Julie",
   "Yvan",
   "Petronille",
   "Madeleine",
   "Geraldine",
   "Yves",
   "Paul",
   "Ugs",
   "Jean-eudes",
   "Clitorine",
   "Gertrude",
   "Jenifaëlle",
   "Raimond",
   "Joseph",
   "Germaine",
   "Henri",
   "Marcel",
   "Georges",
   "Suzanne",
   "François",
   "Jean-baptiste",
   "Emile",
   "Morice",
   "Albert",
   "Alban",
   "Eugène",
   "Leon",
   "Lucien",
   "Auguste",
   "Georgette",
   "Robert",
   "Roger",
   "Eleonore",
   "Odénie",
   "Agathe",
   "Hector",
   "Hubert",
   "Gilles",
   "Ernest",
   "Adolphe",
]
var boats = {}
var feeds = []
var poisons = []
app.get('/init', function (req, res) {
   res.send({
      map: MAP,
      boats,
      feeds,
      poisons,
      background: current_background
   })
})
function edit_or_push(id, data) {
   data.id = id
   // modify only attributes that are different
   boats[id] = { ...boats[id], ...data }
}

function boat_collision(boat1) {
   // RETURN THE ANOTHER BOAT THAT CRASH WITH THE FIRST ONE

   for (const [key, value] of Object.entries(boats)) {
      if (boat1.id != value.id) {
         let x = [value.x, value.x + value.width]
         let y = [value.y, value.y + value.height]
         let myx = [boat1.x, boat1.x + boat1.width]
         let myy = [boat1.y, boat1.y + boat1.height]
         if (myx[0] <= x[1] && myx[1] >= x[0] && myy[0] <= y[1] && myy[1] >= y[0]) {
            return value.id
         }
      }
   }
}

function eat_collision(boat) {
   for (let i = 0; i < feeds.length; i++) {
      // x & y of feed
      let x = [feeds[i].x, feeds[i].x + 10]
      let y = [feeds[i].y, feeds[i].y + 10]
      // x & y of boat

      let myx = [boat.x, boat.x + boat.width]
      let myy = [boat.y, boat.y + boat.height]
      // if boat & feed touch or in the same area
      if (myx[0] <= x[1] && myx[1] >= x[0] && myy[0] <= y[1] && myy[1] >= y[0]) {
         return feeds[i]

      }
   }
   return false

}
function poison_collision(boat) {
   // verifie si la taille du bateau est superieur a 40
   if (boat.width < 40 || boat.height < 40) {
      return false
   }

   for (let i = 0; i < poisons.length; i++) {

      // x & y of feed
      let x = [poisons[i].x, poisons[i].x + 10]
      let y = [poisons[i].y, poisons[i].y + 10]
      // x & y of boat

      let myx = [boat.x, boat.x + boat.width]
      let myy = [boat.y, boat.y + boat.height]
      // if boat & feed touch or in the same area
      if (myx[0] <= x[1] && myx[1] >= x[0] && myy[0] <= y[1] && myy[1] >= y[0]) {
         return poisons[i]

      }
   }
   return false

}

// établissement de la connexion
io.on('connection', (socket) => {
   console.log(`Connecté au client ${socket.id
      }`)

   socket.on("join", (data) => {
      console.log(data.name + " joined")
      data.id = socket.id
      edit_or_push(socket.id, data)
      io.emit("joined", data)
   })
   socket.on("move", (data) => {
      data.id = socket.id
      moving(data)
   })
   socket.on("disconnect", () => {
      console.log(`Déconnecté du client ${socket.id
         }`)
      delete boats[socket.id]
      io.emit("removed", socket.id)
   })

})

function moving(data) {
   edit_or_push(data.id, {
      x: data.x,
      y: data.y
   })
   // console.log(data)

   // check if the boat crash with another one
   var crash = boat_collision(boats[data.id])
   if (crash) {
      crash = boats[crash]
      var myboat = boats[data.id]
      console.log("crash with", crash)
      // check if the boat is bigger than the other one

      if (myboat.width + myboat.height > crash.width + crash.height) {
         io.emit("dead", {
            id: crash.id
         })
         delete boats[crash.id]
         boats[data.id] = {
            ...boats[data.id],
            width: myboat.width + crash.width,
            height: myboat.height + crash.height
         }
         io.emit("win", {
            id: myboat.id,
            height: myboat.height + crash.height,
            width: myboat.width + crash.width
         })
      }
      if (myboat.width + myboat.height < crash.width + crash.height) {
         io.emit("dead", {
            id: myboat.id
         })
         delete boats[data.id]
         boats[crash.id] = {
            ...crash,
            height: crash.height + myboat.height,
            width: crash.width + myboat.width
         }
         io.emit("win", {
            id: crash.id,
            height: crash.height + myboat.height,
            width: crash.width + myboat.width
         })
         return
      }
      update_scoreboard()

   }

   var eat = eat_collision(boats[data.id])
   if (eat) {
      io.emit("eat", eat)
      feeds.splice(feeds.indexOf(eat), 1)
      console.log(boats[data.id])
      boats[data.id].width += 5
      boats[data.id].height += 5
      let new_size = {
         id: data.id,
         width: boats[data.id].width,
         height: boats[data.id].height
      }
      io.emit("win", new_size)
      update_scoreboard()
   }
   var poison = poison_collision(boats[data.id])
   if (poison) {
      io.emit("eat", poison)
      poisons.splice(poisons.indexOf(poison), 1)
      boats[data.id].width -= 10
      boats[data.id].height -= 10
      let new_size = {
         id: data.id,
         width: boats[data.id].width,
         height: boats[data.id].height
      }
      io.emit("win", new_size)
      update_scoreboard()
   }

   io.emit("move", data)
}

function createIA() {
   let x = Math.floor(Math.random() * MAP.width)
   let y = Math.floor(Math.random() * MAP.height)
   let id = (Math.random() + 1).toString(36).substring(7)
   let name = boats_name[Math.floor(Math.random() * boats_name.length)]
   let size = + Math.floor(Math.random() * 10) + 30
   let boat = {
      id: id,
      x: x,
      y: y,
      name: "🤖 " + name + " #" + id.substring(0, 2),
      width: size,
      height: size,
   }
   boats[id] = boat
   io.emit("joined", boat)
   return boat
}

async function autopilot(ia) {
   while (boats[ia.id]) {
      randomMove(ia)

      await new Promise(r => setTimeout(r, 20))
      //check if the boat is too big
      if (boats[ia.id].width > 500 || boats[ia.id].height > 500) {
         delete boats[ia.id]
         io.emit("dead", ia)
         // generate 10 new ia
         for (let i = 0; i < 10; i++) {
            autopilot(createIA())
         }
         return
      }
   }
}

function randomMove(ia) {
   let boat = boats[ia.id]
   let speedX = 0;
   let speedY = 0;
   let x = boat.x
   let y = boat.y

   var speed = 0
   var size = (ia.width + ia.height);

   speed = 30 * 1 / size
   // move to one random direction
   // cap to feed 
   let bestdirec = get_best_direction(boat, speed)
   if (bestdirec) {
      speedX = bestdirec.speedX
      speedY = bestdirec.speedY
      x += speedX
      y += speedY
      if (x < 0) {
         x = 0
      }
      if (y < 0) {
         y = 0
      }
      if (x > MAP.width) {
         x = MAP.width
      }
      if (y > MAP.height) {
         y = MAP.height
      }
      boats[ia.id] = {
         ...boats[ia.id],
         x: x,
         y: y,
         speedX: speedX,
         speedY: speedY
      }
      moving(boats[ia.id])
   }

}

function get_best_direction(boat, speed) {
   // donne la direction la plus proche de la nourriture ou d'un bateau adverse plus petit 
   let boat_list = Object.values(boats)
   let boat_smallest = boat_list.filter(b => b.id != boat.id && b.width + b.height < boat.width + boat.height)
   var x = boat.x
   var y = boat.y
   var speedX = 0
   var speedY = 0

   let boat_smallest_by_distance = boat_smallest.sort((a, b) => {
      return (Math.abs(a.x - boat.x) + Math.abs(a.y - boat.y)) - (Math.abs(b.x - boat.x) + Math.abs(b.y - boat.y))
   })
   // check what is the best direction
   if (boat_smallest_by_distance.length > 0) {
      x = boat_smallest_by_distance[0].x - boat.x
      y = boat_smallest_by_distance[0].y - boat.y

   } else {
      // short feeds and boats by distance
      let feeds_by_distance = feeds.sort((a, b) => {
         return (Math.abs(a.x - boat.x) + Math.abs(a.y - boat.y)) - (Math.abs(b.x - boat.x) + Math.abs(b.y - boat.y))
      }
      )
      if (feeds_by_distance.length > 0) {
         x = feeds_by_distance[0].x - boat.x
         y = feeds_by_distance[0].y - boat.y
      }

   }

   if (x > 0) {
      speedX = speed
   }
   else if (x < 0) {
      speedX = -(speed)
   }
   if (y > 0) {
      speedY = speed
   }
   else if (y < 0) {
      speedY = -(speed)
   }

   return {
      speedX: speedX,
      speedY: speedY
   }

}

// function random_name() {
//    return random_names[Math.floor(Math.random() * random_names.length)]
setInterval(() => {
   if (Math.random() > 0.9) {
      autopilot(createIA())
   }
}, 1000)


setInterval(() => {
   console.log("Nombre de nourriture : " + feeds.length)
   if (feeds.length < 25) {
      let f = {
         id: (Math.random() + 1).toString(36).substring(7),
         x: Math.random() * MAP.width,
         y: Math.random() * MAP.height,
      }

      feeds.push(f)
      io.emit("feed", f)
   } else {
      // remove random feed


      io.emit("eat", {
         id: feeds[0].id
      })

      feeds.splice(0, 1)
   }
}, 7000)

setInterval(() => {
   console.log("Nombre de poison : " + poisons.length)
   if (poisons.length < 35) {
      let p = {
         id: (Math.random() + 1).toString(36).substring(7),
         x: Math.random() * MAP.width,
         y: Math.random() * MAP.height
      }

      poisons.push(p)
      io.emit("poison", p)
   } else {
      // remove random poison
      poisons.splice(0, 1)
      io.emit("eat", {
         id: poisons[0].id
      })

   }

}, 6000)
// on change app par server
setInterval(() => {
   current_background = rnd_background()
   io.emit("update_background_image", {
      image: current_background
   })
}, 60000)
function update_scoreboard() {
   let score = Object.keys(boats).map(boat => {
      return {
         name: boats[boat].name,
         score: (boats[boat].width + boats[boat].height) / 2
      }
   })
   score.sort((a, b) => {
      return b.score - a.score
   })
   score = score.slice(0, 4)
   io.emit("update_score", {
      score
   })
}
setInterval(() => {
   update_scoreboard()
}, 5000)
const PORT = process.env.PORT || 3000
server.listen(PORT, function () { console.log('Votre app est disponible sur localhost:3000 !') })

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const config = require('./config')
const server = require('http').Server(app)
const io = require('socket.io')(server)

var current_background = random_background()
var boats = {}
var feeds = []
var poisons = []

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.get('/', function (req, res) {
   res.sendFile('public/index.html', { root: __dirname })
})
app.use('/images', express.static('public/images'))
app.use('/musique', express.static('public/musique'))
app.use('/js', express.static('public/js'))
app.get('/init', function (req, res) {
   let {x,y} = find_safe_position()
   res.send({
      map: config.MAP,
      boats,
      feeds,
      poisons,
      background: current_background,
      x,
      y
   })
})

function random_background() {
   return "/images/" + (Math.floor(Math.random() * 5) + 1) + ".jpg"
}

function boat_collision(boat1) {

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
      let x = [feeds[i].x, feeds[i].x + 10]
      let y = [feeds[i].y, feeds[i].y + 10]

      let myx = [boat.x, boat.x + boat.width]
      let myy = [boat.y, boat.y + boat.height]
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

      let x = [poisons[i].x, poisons[i].x + 10]
      let y = [poisons[i].y, poisons[i].y + 10]

      let myx = [boat.x, boat.x + boat.width]
      let myy = [boat.y, boat.y + boat.height]
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
      boats[socket.id] = data
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
   
   boats[data.id] = {
      ...boats[data.id],
      x: data.x,
      y: data.y
   }
   // console.log(data)

   // Verification de la collision
   var crash = boat_collision(boats[data.id])
   if (crash) {
      crash = boats[crash]
      var myboat = boats[data.id]
      //console.log("crash with", crash)


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
      // console.log(boats[data.id])
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
   // console.log(`
   // ${boats[data.id].name}
   // To ${boats[data.id].x} Speed ${boats[data.id].speedX}
   // To ${boats[data.id].y} Speed ${boats[data.id].speedY}
   // `)
   io.emit("move", data)
}

function create_IA() {
   var {x,y} = find_safe_position()

   let id = (Math.random() + 1).toString(36).substring(7)
   let name = config.BOATS_NAME_IA[Math.floor(Math.random() * config.BOATS_NAME_IA.length)]
   let size = 40 + Math.floor(Math.random() * 20)
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

function find_safe_position(){
   let x = Math.floor(Math.random() * config.MAP.width)
   let y = Math.floor(Math.random() * config.MAP.height)
   // Cherche si la position est libre (100px au alentour)
   let free = true
   while (!free) {
      for (let i = 0; i < boats.length; i++) {
         if (boats[i].x <= x + 100 && boats[i].x >= x - 100 && boats[i].y <= y + 100 && boats[i].y >= y - 100) {
            x = Math.floor(Math.random() * config.MAP.width)
            y = Math.floor(Math.random() * config.MAP.height)
            free = false
            break
         }
      }
      free = true
   }
   return {
      x: x,
      y: y
   }
}



async function auto_pilot(ia) {
   while (boats[ia.id]) {
      
      // Au dela de MAX_BOATS_IA le bateau a perdu (pour eviter que les IA gagne en boucle)
      
      if (boats[ia.id].width > config.MAX_SIZE_IA || boats[ia.id].height > config.MAX_SIZE_IA) {
         delete boats[ia.id]
         io.emit("dead", ia)
         break
      }
         
      // on attend 20 ms (fps)
      await new Promise(r => setTimeout(r, 20))

      ia_move(ia)

   }
}

function ia_move(ia){
   ia = boats[ia.id]
   let speedX = 0;
   let speedY = 0;
   let x = ia.x
   let y = ia.y

   var speed = 0
   var size = (ia.width + ia.height);
   speed = 100 * 1 / size
   

   let bestdirec = get_best_direction(ia, speed)
   if (bestdirec) {
      speedX = bestdirec.speedX
      speedY = bestdirec.speedY
      // console.log(bestdirec)
      x += speedX
      y += speedY
      if (x < 0) {
         x = 0
      }
      if (y < 0) {
         y = 0
      }
      if (x > config.MAP.width - ia.width) {
         x = config.MAP.width - ia.width
      }
      if (y > config.MAP.height - ia.height) {
         y = config.MAP.height - ia.height
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
   // Permet de déterminer la direction la plus optimale pour se déplacer
   // en fonction de la position de la nourriture la plus proche
   // ou du bateau le plus proche (si il y en a un et qu'il soit plus petit)
   let boat_list = Object.values(boats)
   let boat_smallest = boat_list.filter(b => b.id != boat.id && b.width + b.height < boat.width + boat.height)
   var x = boat.x
   var y = boat.y
   var speedX = 0
   var speedY = 0

   let boat_smallest_by_distance = boat_smallest.sort((a, b) => {
      return (Math.abs(a.x - boat.x) + Math.abs(a.y - boat.y)) - (Math.abs(b.x - boat.x) + Math.abs(b.y - boat.y))
   })
   
   if (boat_smallest_by_distance.length > 0) {
      x = boat_smallest_by_distance[0].x - boat.x
      y = boat_smallest_by_distance[0].y - boat.y

   } else {
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

// GENERATION DES IAs :

setInterval(() => {
      if (Math.random() > 0.8 && Object.values(boats).length < config.MAX_BOATS_IA) {
      auto_pilot(create_IA())
   }
}, 1000)


// GENERATION DE LA NOURRITURES (feed) :

setInterval(() => {
   console.log("Nombre de nourriture : " + feeds.length)
   if (feeds.length < 25) {
      let f = {
         id: (Math.random() + 1).toString(36).substring(7),
         x: Math.random() * config.MAP.width - 10,
         y: Math.random() * config.MAP.height - 10,
      }
      feeds.push(f)
      io.emit("feed", f)
   } else {
      // Suppression de la nourriture la plus vieille
      io.emit("eat", {
         id: feeds[0].id
      })

      feeds.splice(0, 1)
   }
}, 7000)

// GENERATION DES POISSONS :

setInterval(() => {
   console.log("Nombre de poison : " + poisons.length)
   if (poisons.length < 35) {
      let p = {
         id: (Math.random() + 1).toString(36).substring(7),
         x: Math.random() * config.MAP.width - 10,
         y: Math.random() * config.MAP.height - 10,
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

// CHANGEMENT DE FOND :
setInterval(() => {
   current_background = random_background()
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

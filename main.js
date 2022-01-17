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

function rnd_background() {
   return "/images/" + (Math.floor(Math.random() * 5) + 1) + ".jpg"
}
var current_background = rnd_background()
// serv static files at /images
app.use('/images', express.static('public/images'))
app.use('/musique', express.static('public/musique'))
app.use('/js', express.static('public/js'))

var boats = {}
var feeds = []
app.get('/init', function (req, res) {
   res.send({
      boats,
      feeds,
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
   // RETURN THE ANOTHER BOAT THAT EAT THE FIRST ONE
   for (let i = 0; i < feeds.length; i++) {
      if (boat.id != feeds[i].id) {
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
      edit_or_push(socket.id, {
         x: data.x,
         y: data.y
      })
      // console.log(data)

      // check if the boat crash with another one
      var crash = boat_collision(boats[socket.id])
      if (crash) {
         crash = boats[crash]
         var myboat = boats[socket.id]
         console.log("crash with", crash)
         // check if the boat is bigger than the other one

         if (myboat.width + myboat.height > crash.width + crash.height) {
            io.emit("dead", {
               id: crash.id
            })
            delete boats[crash.id]
            boats[socket.id] = {
               ...boats[socket.id],
               width: myboat.width + crash.width,
               height: myboat.height + crash.height
            }
            io.emit("win", {
               id: myboat.id,
               height: myboat.height + crash.height,
               width: myboat.width + crash.width
            })
         }
         if (myboat.width + myboat.height < crash.width + crash.height)  {
            io.emit("dead", {
               id: myboat.id
            })
            delete boats[socket.id]
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

      var eat = eat_collision(boats[socket.id])
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

      io.emit("move", data)

   })
   socket.on("disconnect", () => {
      console.log(`Déconnecté du client ${socket.id
         }`)
      delete boats[socket.id]
      io.emit("removed", socket.id)
   })
   setInterval(() => {
      console.log("Nombre de nourriture : " + feeds.length)
      if (feeds.length < 25) {
         let f = {
            id: (Math.random() + 1).toString(36).substring(7),
            x: Math.random() * 1800,
            y: Math.random() * 1000
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



}) // on change app par server
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
server.listen(3000, function () { console.log('Votre app est disponible sur localhost:3000 !') })

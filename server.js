const express = require('express')
const { appendFileSync } = require('fs')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const randomWords = require('random-words')

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

const rooms = {}
const users = []
let gameRoomString;
// show all rooms
app.get('/', (req, res) => {
  gameRoomString = randomWords() + '-' + randomWords() + '-' + randomWords();
  res.render('index', {gameRoom: gameRoomString})
})

// enter a specific room
app.get('/room/:id', (req, res) => {
  if(rooms[req.params.id] == null) {
    return res.redirect('/')
  }
  res.render('room', {roomName: req.params.id})
})

app.post("/room", (req, res) => {
  if(rooms[req.body.room] != null) {
    return res.redirect('/');
  }
  rooms[req.body.room] = { users: {} }
  res.redirect('/room/' + req.body.room)
  // Send message that new room was created
  // io.emit('room-created', req.body.room)
})

server.listen(3000, () => {
  console.log("Server is listening on Port 3000");
});

io.on('connection', socket => {
  console.log("A new user connected: " + socket.id);
  socket.on('new-user', (room, name) => {
    socket.join(room)

    let playerTurn = 1; // initialize first turn to player 1

    // initialize player details
    let self =
      {id           :  socket.id,
       playerName   :  name,
       diceKount    :  4,
       roomName     :  room,
       response     : 'Awaiting turn...',
       score        : 0,
      }
    
    // initialize dice values for player
    let dice = [];
    for(let i = 0; i < self.diceKount; i++){
        dice.push(Math.floor(Math.random() * 6) + 1);
    }
    self.dice = dice;

    // update users object with newly created user and associated player data
    users.push(self)
    
    
    // filter users object to just those in this room
    let roomUsers = users.filter(function(el){
      return el.roomName == room
    })

    for(let i = 0; i < roomUsers.length; i++){
      // delete roomUsers[i].dice // remove dice values so other players cannot set dice values besides their own
      roomUsers[i].playerNumber = i + 1
    }

    // emit dice info back to new user
    socket.emit('dice', dice)
    socket.emit('playerData', {self: self, playerTurn: playerTurn})
    
    // emit all player's info back to room
    io.to(room).emit('player-board', roomUsers)
  })
  socket.on('raise', ([raiseData, tbl]) => {
    let validRaise = false;
    if(raiseData.raiseQuantity > raiseData.currentQuantity){
      validRaise = true;
    } else if((raiseData.raiseValue == 1 || raiseData.raiseValue >= raiseData.currentValue) && raiseData.raiseQuantity >= raiseData.currentQuantity) {
      validRaise = true;
    }
    if(validRaise) {
      let room = raiseData.room;
      let roomUsers = users.filter(function(el){
        return el.roomName == room
      })
      playerTurn = raiseData.playerTurn
      playerTurn = setPlayerTurn(playerTurn, roomUsers);
      let raiseInfo = 
      {
        playerTurn: playerTurn,
        raiseValue: raiseData.raiseValue,
        raiseQuantity: raiseData.raiseQuantity,
      }
      io.to(room).emit('player-board', tbl)
      io.to(room).emit('raise', raiseInfo)
    } else {
      socket.emit('invalidRaise')
    }
  });
  socket.on('call', ([callData, tbl]) => {
    let room = callData.room;
    let roomUsers = users.filter(function(el){
      return el.roomName == room
    })
    playerTurn = callData.playerTurn;
    let playerCalls = 0;
    let playerCount = 0;
    for (let i in tbl) {
      playerCount++;
      if (tbl[i].response == 'Call') {
        playerCalls++;
      }
    }
    if(playerCount > playerCalls + 1){
      // if all players but one have not called (the one who made the origianl bet), then we are good to move to the next player's turn
      playerTurn = setPlayerTurn(playerTurn, roomUsers);
      io.to(room).emit('player-board', tbl)
      io.to(room).emit('next-player', playerTurn)
    } else {
      // if all players have called the original player's bet, then we need to see if the original player won, or will be kicking a die
      
      // define variables to determine what the player's bet (value and quantity) is
      let targetValue    = callData.currentValue;
      let targetQuantity = callData.currentQuantity;
      // loop through all player's dice to see how many times the target value actually appears
      let actualQuantity = 0;
        for (let i in tbl) {
          users[i].dice.forEach((die) => {
            if(die == targetValue){
              actualQuantity++;
            }
          })
        }

      if(actualQuantity >= targetQuantity) {
        // user wins, and their score needs to be increased +1
        // and then new dice need to be issued
        let winner = roomUsers.filter(function(el){
          return el.playerNumber == playerTurn;
        })
        console.log(winner);
      } else {
        // user kicks a die, and new dice need to be issued
        console.log('LOSER')
      }
    }
  });
  socket.on('send-chat-message', (room, message) => {
    socket.to(room).broadcast.emit('chat-message', { 
      message: message, 
      name: rooms[room].users[socket.id] })
  })
  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
  })
})

function setPlayerTurn(number, array) {
  if(number < array.length) {
    number++;
    return number;
  } else {
    return number = 1;
  }
}

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}

Object.filter = (obj, predicate) => 
    Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => (res[key] = obj[key], res), {} );

// function sendPlayerboardToRoom(room){
//   for (const property in users){
//     if(users[])
//   }
  
//   console.log(room)
//   let roomUsers = Object.filter(users, value => roomName = room)
//   console.log(roomUsers)
// };
          
// var scores = {
//   John: 2, Sarah: 3, Janet: 1
// };
// var filtered = Object.filter(scores, score => score > 1); 
// console.log(filtered);
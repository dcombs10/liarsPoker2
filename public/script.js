const socket = io('http://localhost:3000')
const messageContainer = document.getElementById('message-container')
const roomContainer = document.getElementById('room-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const playersDice = document.getElementById('players-dice')

if(playersDice) {
  const name = prompt('What is your name?')
  // appendMessage('You joined')
  socket.emit('new-user', roomName, name)

  messageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = messageInput.value
    appendMessage(`You: ${message}`)
    socket.emit('send-chat-message', roomName, message)
    messageInput.value = ''
  })
}

socket.on('room-created', room => {
  // <div><%= room %></div>
  // <a href="/<%= room %>">Join</a>
  const roomElement = document.createElement('div')
  roomElement.innerText = room
  const roomLink = document.createElement('a')
  roomLink.href = '/${room}'
  roomLink.innerText = 'join'
  roomContainer.append(roomElement)
  roomContainer.append(roomLink)
})

socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`)
})

socket.on('user-connected', name => {
  appendMessage(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`)
})



function appendMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

function copyToClipboard() {
  /* Get the text field */
  var copyText = document.getElementById("new-game-link").innerHTML;
  /* Select the text field */
  document.body.appendChild(copyText);
  copyText.select();
  copyText.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");
  document.body.removeChild(copyText);

  /* Alert the copied text */
  alert("Copied the text: " + copyText.value);
}

socket.on('dice', (dicevalues) => {

  var str = '<div class="ui tiny images">';

  dicevalues.forEach(function(dice) {
      str += '<img class="ui image" src="../images/die' + dice + '.png" alt="">';
      // str += '1';
  });

  str += '</div>';
  document.getElementById("playersDice").innerHTML = str;   
  // $(".dice").each(function(dicevalues) {
  //     $(this).html('<img src="../images/die' + dicevalues + '.png" alt="">');
  // });

});
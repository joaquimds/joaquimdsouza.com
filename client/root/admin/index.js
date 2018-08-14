const {setError} = require('../../components/forms/error')

let token = window.localStorage.token

const loginForm = document.getElementById('login-form')
const dashboard = document.getElementById('dashboard')

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault()

  const password = document.getElementById('password').value

  try {
    token = await login(password)
    showDashboard()
  } catch (e) {
    setError('login-form', 'Failed')
  }
})

showDashboard()

async function login (password) {
  const response = await window.fetch('/api/login', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({password})
  })
  if (!response.ok) {
    throw new Error()
  }
  const json = await response.json()
  if (!json || !json.token) {
    throw new Error()
  }
  return json.token
}

function showDashboard () {
  if (!token) {
    loginForm.classList.remove('hidden')
    return
  }
  loginForm.classList.add('hidden')
  dashboard.classList.remove('hidden')
  document.querySelectorAll('.message').forEach(message => {
    const messageId = message.getAttribute('id').split('message-')[1]
    const button = document.getElementById(`delete-${messageId}`)
    button.addEventListener('click', async (e) => {
      e.preventDefault()
      await deleteMessage(messageId)
    })
  })
}

function deleteMessage (messageId) {
  return secureRequest(`/api/message/${messageId}`, {
    method: 'delete',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function secureRequest (path, params) {
  params.headers['Authorization'] = `TOKEN ${token}`

  try {
    const response = await window.fetch(path, params)
    if (!response.ok) {
      token = ''
    }
  } catch (e) {
    token = ''
  }

  window.localStorage.token = token
  window.location.reload(true)
}

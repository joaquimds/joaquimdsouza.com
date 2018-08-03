const submitButton = document.getElementById('message-form-submit')
const errorSpan = document.getElementById('message-form-error')

document.getElementById('message-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  setLoading(true)

  const name = document.getElementById('name').value
  const message = document.getElementById('message').value

  let error
  try {
    const response = await sendMessage(name, message)
    if (!response.ok) {
      error = response.status === 409
        ? 'Somebody already gave me that message, be more original!' : response.statusText
    }
  } catch (e) {
    error = 'Failed to submit form - unknown error'
  }

  if (error) {
    setLoading(false)
    setError(error)
    return
  }

  window.location.reload(true)
})

function sendMessage (name, message) {
  return window.fetch('/api/commit', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, message })
  })
}

function setLoading (isLoading) {
  const activeClass = 'form__submit--active'

  if (isLoading) {
    submitButton.classList.add(activeClass)
    submitButton.innerText = 'Sending'
    return
  }

  submitButton.classList.remove(activeClass)
  submitButton.innerText = 'Send'
}

function setError (message) {
  const activeClass = 'form__error--active'

  if (message) {
    errorSpan.innerText = message
    errorSpan.classList.add(activeClass)
    return
  }

  errorSpan.classList.remove(activeClass)
  errorSpan.innerText = ''
}

const submitButton = document.getElementById('message-form-submit')

document.getElementById('message-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  setLoading()

  const name = document.getElementById('name').value
  const message = document.getElementById('message').value
  await window.fetch('/api/commit', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, message })
  })

  window.location.reload(true)
})

function setLoading () {
  let count = 0
  setInterval(() => {
    count++
    if (count > 3) {
      submitButton.innerText = submitButton.innerText + '.'
      return
    }
    submitButton.innerText = 'Sending'.substring(0, 4 + count)
  }, 200)
}

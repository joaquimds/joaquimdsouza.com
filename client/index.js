document.getElementById('message-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  const name = document.getElementById('name').value
  const message = document.getElementById('message').value
  await window.fetch('/api/commit', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, message })
  })
})

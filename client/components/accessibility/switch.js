const container = document.getElementById('container')
const accessibilitySwitch = document.getElementById('accessibility-switch')
const accessibleClass = 'container--accessible'

accessibilitySwitch.addEventListener('change', e => {
  window.localStorage.accessible = e.target.checked
  updateAccessibility()
})

updateAccessibility()

function updateAccessibility () {
  const accessible = window.localStorage.accessible === 'true'
  accessibilitySwitch.checked = accessible

  container.classList.remove(accessibleClass)
  if (accessible) {
    container.classList.add(accessibleClass)
  }
}

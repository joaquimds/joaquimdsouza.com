const documentEl = document.documentElement
const accessibilityIncrease = document.getElementById('accessibility-increase')
const accessibilityDecrease = document.getElementById('accessibility-decrease')
const maxAccessibility = 3
const minAccessibility = -2

accessibilityIncrease.addEventListener('click', e => {
  e.preventDefault()
  const accessibility = getStoredAccessibility()
  if (accessibility < maxAccessibility) {
    window.localStorage.accessibility = accessibility + 1
  }
  updateAccessibility()
})

accessibilityDecrease.addEventListener('click', e => {
  e.preventDefault()
  const accessibility = getStoredAccessibility()
  if (accessibility > minAccessibility) {
    window.localStorage.accessibility = accessibility - 1
  }
  updateAccessibility()
})

updateAccessibility()

function updateAccessibility () {
  const accessibility = getStoredAccessibility()
  documentEl.setAttribute('class', `accessibility-${accessibility}`)

  if (accessibility === maxAccessibility) {
    accessibilityIncrease.setAttribute('disabled', '')
  } else {
    accessibilityIncrease.removeAttribute('disabled')
  }

  if (accessibility === minAccessibility) {
    accessibilityDecrease.setAttribute('disabled', '')
  } else {
    accessibilityDecrease.removeAttribute('disabled')
  }
}

function getStoredAccessibility () {
  return parseInt(window.localStorage.accessibility) || 0
}
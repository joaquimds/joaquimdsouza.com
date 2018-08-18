if (!window.localStorage) {
  window.localStorage = {}
}

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
  let accessibilityClasses = []
  let accessibilityLevel = getStoredAccessibility()

  if (accessibilityLevel === maxAccessibility) {
    accessibilityIncrease.setAttribute('disabled', '')
  } else {
    accessibilityIncrease.removeAttribute('disabled')
  }

  if (accessibilityLevel === minAccessibility) {
    accessibilityDecrease.setAttribute('disabled', '')
  } else {
    accessibilityDecrease.removeAttribute('disabled')
  }

  while (accessibilityLevel > 0) {
    accessibilityClasses.push(`accessibility-${accessibilityLevel}`)
    accessibilityLevel--
  }
  while (accessibilityLevel < 0) {
    accessibilityClasses.push(`inaccessibility-${accessibilityLevel * -1}`)
    accessibilityLevel++
  }
  documentEl.setAttribute('class', accessibilityClasses.join(' '))
}

function getStoredAccessibility () {
  return parseInt(window.localStorage.accessibility) || 0
}

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
  const currentAccessibility = getStoredAccessibility()

  const accessibilityClasses = []
  for (let level = minAccessibility; level < maxAccessibility; level++) {
    if (level < 0 && currentAccessibility < 0 && currentAccessibility <= level) {
      accessibilityClasses.push(`inaccessibility-${level}`)
    } else if (level > 0 && currentAccessibility > 0 && currentAccessibility >= level) {
      accessibilityClasses.push(`accessibility-${level}`)
    }
  }
  documentEl.setAttribute('class', accessibilityClasses.join(' '))

  accessibilityIncrease.removeAttribute('disabled')
  accessibilityDecrease.removeAttribute('disabled')
  if (currentAccessibility === maxAccessibility) {
    accessibilityIncrease.setAttribute('disabled', '')
  } else if (currentAccessibility === minAccessibility) {
    accessibilityDecrease.setAttribute('disabled', '')
  }
}

function getStoredAccessibility () {
  return parseInt(window.localStorage.accessibility) || 0
}

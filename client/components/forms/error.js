function setError (formId, message) {
  const errorSpan = document.querySelector(`#${formId} .form__error`)
  if (!errorSpan) {
    return
  }

  const activeClass = 'form__error--active'

  if (message) {
    errorSpan.innerText = message
    errorSpan.classList.add(activeClass)
    return
  }

  errorSpan.classList.remove(activeClass)
  errorSpan.innerText = ''
}

module.exports = { setError }

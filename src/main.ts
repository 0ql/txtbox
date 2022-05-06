import './style.css'

const sampleText = `import App from './App.svelte'
import { sendNotification } from './components/ts/notifications'
import { loadFont } from './font'
import { template } from './store'
import { loadTheme } from './theme'

if ('serviceWorker' in navigator) {
	navigator.serviceWorker
		.register('./sw.js', { scope: './' })
		.then((reg) => {
			// registration worked
			console.log('Registration of Serviceworker succeeded.')

			reg.update()
		})
		.catch((error) => {
			// registration failed
			console.log('Registration of Serviceworker failed with ' + error)
		})

	navigator.serviceWorker.addEventListener('message', (event) => {
		switch (event.data.type) {
			case 'FONT FETCH FAILED':
				sendNotification({
					type: 'warning',
					content: Coudn't fetch font. Defaulting to ''...,
				})
				loadFont(template.cosmetics.family)
				break
			case 'THEME FETCH FAILED':
				sendNotification({
					type: 'warning',
				})
				loadTheme(template.cosmetics.theme.name)
				break
			case 'FETCH FAILED':
				sendNotification({
					type: 'warning',
					content: event.data.msg,
				})
				break
		}
	})
}

const app = new App({
	target: document.body,
})

export default app
`

let appState = {
  mode: 'normal',
  topLine: 0,
  selection: {
    active: true,
    from: {
      line: 0,
      letter: 0,
    },
    to: {
      line: 10,
      letter: 0,
    }
  }
}

let caretData = {
  template: (content: string): string => {
    return `<pre class="caret ${appState.mode === 'insert' ? 'caret-insertmode' : ''}">${content ? content : " "}</pre>`
  },
  insertFront: false,
  atLine: 10,
  atLetter: 1
}
let cssProperties = {
  lineHeightInRem: 1.5,
  letterSpacing: 0.2
}

interface ChEl extends ChildNode {
  classList: DOMTokenList
  innerHTML: string
}

interface El extends HTMLElement {
  childNodes: NodeListOf<ChEl>
}

let txtbox: El
let txtlines = sampleText.split(/\n/g)
let array = txtlines.map((line: string) => {
  return {
    txt: line,
    active: false
  }
})

function convertRemToPixels(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function renderLine(y: number): string {
  let res: string = ''

  if (array[y].active) {
    res += `<pre class="line line-active">${array[y].txt}</pre>`
  } else {
    if (array[y].txt.length === 0) {
      res += `<pre class="line"> </pre>`
    }
    else res += `<pre class="line">${array[y].txt}</pre>`
  }

  return res
}

function render(lineTop: number, linesAmount: number) {
  let res: string = ""

  for (let y = lineTop; y < lineTop + linesAmount; y++) {
    res += renderLine(y)
  }

  txtbox.innerHTML = res
}

function determineOptimalLinesToRender(): number {
  const lineHeightInPx = convertRemToPixels(cssProperties.lineHeightInRem)
  return Math.floor(window.innerHeight / lineHeightInPx)
}

const root = document.documentElement.style
function cssVar(property: string, value: string | null) {
  root.setProperty(property, value)
}

function updateCSS() {
  const p = cssProperties

  cssVar('--line-height', p.lineHeightInRem + 'rem')
  cssVar('--letter-spacing', p.letterSpacing + 'rem')
}

const verticalLinesToBorders = 5
function manageScrolling() {
  if (caretData.atLine + verticalLinesToBorders > appState.topLine + determineOptimalLinesToRender() && caretData.atLine + verticalLinesToBorders < array.length) {
    appState.topLine++
  } else if (caretData.atLine <= appState.topLine && caretData.atLine > 0) {
    appState.topLine--
  } else return
  render(appState.topLine, determineOptimalLinesToRender())
}

const range = new Range()
function eventListeners() {
  document.onkeydown = (e: KeyboardEvent) => {

    // handle normalmode
    if (appState.mode === "normal") {

      switch (e.key) {
        case "j":
          array[caretData.atLine].active = false
          if (array.length > caretData.atLine + 2) caretData.atLine++
          manageScrolling()
          array[caretData.atLine].active = true
          break
        case "k":
          array[caretData.atLine].active = false
          if (caretData.atLine > 0) caretData.atLine--
          manageScrolling()
          array[caretData.atLine].active = true
          break
        case "h":
          if (caretData.atLetter > 0) caretData.atLetter--
          break
        case "l":
          if (caretData.atLetter + 1 < array[caretData.atLine].txt.length) {
            caretData.atLetter++
          }
          break
        case "i":
          appState.mode = 'insert'
          caretData.insertFront = true
          break
        case "a":
          appState.mode = 'insert'
          caretData.insertFront = false
          break
        case "o":
          caretData.insertFront = false
          array = array.slice(0, caretData.atLine + 1).concat([{ txt: '', active: true }], array.slice(caretData.atLine + 1))
          caretData.atLetter = 0
          caretData.atLine++
          manageScrolling()
          appState.mode = 'insert'
          render(appState.topLine, determineOptimalLinesToRender())
          break
        case "v":
          appState.mode = 'visual'
          appState.selection.active = true
          appState.selection.from.line = caretData.atLine
          appState.selection.from.letter = caretData.atLetter
          appState.selection.to.line = caretData.atLine
          appState.selection.to.letter = caretData.atLetter
          return
      }

    } else if (appState.mode === 'visual') {

      switch (e.key) {
        case "j":
          array[caretData.atLine].active = false
          if (array.length > caretData.atLine + 2) {
            caretData.atLine++
            if (array[caretData.atLine].txt.length <= caretData.atLetter) {
              if (array[caretData.atLine].txt.length > 0) caretData.atLetter = array[caretData.atLine].txt.length - 1
              else caretData.atLetter = 0
              appState.selection.to.letter = array[caretData.atLine].txt.length
            }
            appState.selection.to.line++
          }
          manageScrolling()
          array[caretData.atLine].active = true
          break
        case "k":
          array[caretData.atLine].active = false
          if (caretData.atLine > 0) {
            caretData.atLine--
            if (array[caretData.atLine].txt.length <= caretData.atLetter) {
              if (array[caretData.atLine].txt.length > 0) caretData.atLetter = array[caretData.atLine].txt.length - 1
              else caretData.atLetter = 0
              appState.selection.to.letter = array[caretData.atLine].txt.length
            }
            appState.selection.to.line--
          }
          manageScrolling()
          array[caretData.atLine].active = true
          break
        case "h":
          if (caretData.atLetter > 0) {
            caretData.atLetter--
            appState.selection.to.letter--
          }
          break
        case "l":
          if (caretData.atLetter < array[caretData.atLine].txt.length) {
            caretData.atLetter++
            appState.selection.to.letter++
          }
          break
        case "Escape":
          appState.mode = 'normal'
          appState.selection.active = false
          break
      }
      // handle insertmode
    } else if (appState.mode === 'insert') {

      if (e.key === 'Meta' || e.key === 'Shift' || e.key === 'Control' || e.key === 'CapsLock' || e.key === 'Alt') return

      e.preventDefault()

      switch (e.key) {
        case "Escape":
          appState.mode = 'normal'
          break
        case "Delete":
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1)) + array[caretData.atLine].txt.slice(caretData.atLetter + 1 + (caretData.insertFront ? 0 : 1))
          break
        case "Backspace":
          // caret at first letter
          if (caretData.atLetter === 0) {
            // caret at top
            if (caretData.atLine === 0) return

            // move to line above
            if (array[caretData.atLine - 1].txt.length === 0) {
              caretData.insertFront = true
              array[caretData.atLine - 1].txt = array[caretData.atLine].txt
            } else {
              caretData.insertFront = false
              caretData.atLetter = array[caretData.atLine - 1].txt.length
              array[caretData.atLine - 1].txt += array[caretData.atLine].txt
              caretData.atLetter--
            }

            array.splice(caretData.atLine, 1)
            caretData.atLine--
            manageScrolling()
            render(appState.topLine, determineOptimalLinesToRender())
          } else {
            array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter - (caretData.insertFront ? 1 : 0)) + array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1))
            caretData.atLetter--
          }
          break
        case "Tab":
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter) + '\t' + array[caretData.atLine].txt.slice(caretData.atLetter)
          caretData.atLetter++
          break
        case "Enter":
          array = array.slice(0, caretData.atLine + 1).concat([{ txt: array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1)), active: true }], array.slice(caretData.atLine + 1))
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1))
          caretData.insertFront = true
          caretData.atLetter = 0
          caretData.atLine++
          manageScrolling()
          render(appState.topLine, determineOptimalLinesToRender())
          break
        default:
          if (array[caretData.atLine].txt.length > 0) {
            array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1)) + e.key + array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1))
          } else {
            array[caretData.atLine].txt += e.key
          }
          caretData.atLetter++
          break
      }
    }

    // highlight active line with css class
    for (let i = 0; i < txtbox.childNodes.length; i++) {
      if (array[i + appState.topLine].active) {
        // @ts-ignore
        txtbox.childNodes[i].classList.add('line-active')
      } else {
        if (txtbox.childNodes[i].classList.contains('line-active')) {
          txtbox.childNodes[i].innerHTML = array[appState.topLine + i].txt
          // @ts-ignore
          txtbox.childNodes[i].classList.remove('line-active')
        }
      }
    }

    // render caret
    let activeNode = txtbox.childNodes[caretData.atLine - appState.topLine]
    if (appState.mode === 'normal' || appState.mode === 'visual') {
      activeNode.innerHTML = `<pre>${array[caretData.atLine].txt.slice(0, caretData.atLetter)}</pre>${caretData.template(array[caretData.atLine].txt[caretData.atLetter])}${array[caretData.atLine].txt.slice(caretData.atLetter + 1)}`
    } else if (appState.mode === 'insert') {
      activeNode.innerHTML = `<pre>${array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1))}</pre>${caretData.template('')}${array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1))}`
    }

    // manage selection
    if (appState.selection.active) {
      if (caretData.atLine < appState.selection.from.line) {
        appState.selection.to.line = appState.selection.from.line
        appState.selection.to.letter = appState.selection.from.letter
        appState.selection.from.line = caretData.atLine
        appState.selection.from.letter = caretData.atLetter
      }
      if (appState.selection.from.line === caretData.atLine) range.setStart(txtbox.childNodes[caretData.atLine].childNodes[0].childNodes[0], appState.selection.from.letter)
      else if (appState.selection.from.line < appState.topLine) range.setStart(txtbox.childNodes[0].childNodes[0], 0)
      else range.setStart(txtbox.childNodes[appState.selection.from.line - appState.topLine].childNodes[0], appState.selection.from.letter)

      if (appState.selection.to.line === caretData.atLine) {
        let el = document.querySelector(".caret")
        if (!el) return
        range.setEnd(el, 0)
      } else if (appState.selection.to.line < appState.topLine) return
      else range.setEnd(txtbox.childNodes[appState.selection.to.line - appState.topLine].childNodes[0], appState.selection.to.letter)

      let selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

  }
}

function main() {
  let el = document.getElementById("textbox")
  if (el) txtbox = el as El
  else return
  eventListeners()
  updateCSS()
  render(appState.topLine, appState.topLine + determineOptimalLinesToRender())
}

main()

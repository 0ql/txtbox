import './style.css'

interface ChEl extends ChildNode {
  classList: DOMTokenList
  innerHTML: string
}
interface El extends HTMLElement {
  childNodes: NodeListOf<ChEl>
}

const appState = {
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
const caretData = {
  template: (content: string): string => {
    return `<pre class="caret ${appState.mode === 'insert' ? 'caret-insertmode' : ''}">${content ? content : " "}</pre>`
  },
  insertFront: false,
  atLine: 10,
  atLetter: 1
}
const properties = {
  behaviour: {
    insertModeExitFront: true,
    horizontalSpaceToBorders: 5,
  },
  css: {
    lineHeightInRem: 1.5,
    letterSpacing: 0.2
  }
}
let txtbox: El, sampleText: string, array: {
  txt: string,
  active: boolean
}[]

function convertRemToPixels(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function determineOptimalLinesToRender(): number {
  const lineHeightInPx = convertRemToPixels(properties.css.lineHeightInRem)
  return Math.floor(window.innerHeight / lineHeightInPx)
}

function renderLineHTML(y: number): string {
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

function renderAll(lineTop: number, linesAmount: number) {
  let res: string = ""

  for (let y = lineTop; y < lineTop + linesAmount + 1; y++) {
    res += renderLineHTML(y)
  }

  txtbox.innerHTML = res
}

const root = document.documentElement.style
function cssVar(property: string, value: string | null) {
  root.setProperty(property, value)
}

function updateCSS() {
  const p = properties.css

  cssVar('--line-height', p.lineHeightInRem + 'rem')
  cssVar('--letter-spacing', p.letterSpacing + 'rem')
}

function manageScrolling() {
  if (caretData.atLine + properties.behaviour.horizontalSpaceToBorders > appState.topLine + determineOptimalLinesToRender() && appState.topLine + determineOptimalLinesToRender() < array.length - 1) {
    appState.topLine++
  } else if (caretData.atLine - properties.behaviour.horizontalSpaceToBorders < appState.topLine && appState.topLine > 0) {
    appState.topLine--
  } else return
  renderAll(appState.topLine, determineOptimalLinesToRender())
}

function renderCaret() {
  let activeNode = txtbox.childNodes[caretData.atLine - appState.topLine]
  if (appState.mode === 'normal' || appState.mode === 'visual') {
    activeNode.innerHTML = `<pre>${array[caretData.atLine].txt.slice(0, caretData.atLetter)}</pre>${caretData.template(array[caretData.atLine].txt[caretData.atLetter])}${array[caretData.atLine].txt.slice(caretData.atLetter + 1)}`
  } else if (appState.mode === 'insert') {
    activeNode.innerHTML = `<pre>${array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1))}</pre>${caretData.template('')}${array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1))}`
  }
}

function highlightLine() {
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
}

function caretHBoundsAlign() {
  // make sure the caret stays within bounds horizontally
  if (array[caretData.atLine].txt.length === 0) caretData.atLetter = 0
  else if (caretData.atLetter > array[caretData.atLine].txt.length - 1) caretData.atLetter = array[caretData.atLine].txt.length - 1
  else if (caretData.atLetter < 0) caretData.atLetter = 0
}

function caretHMoveRight() {
  caretData.atLetter = array[caretData.atLine].txt.length - 1
  if (caretData.atLetter < 0) caretData.atLetter = 0
}

function removeLineFromArr(line: number) {
  array = array.slice(0, line).concat(array.slice(line + 1))
}

function normalMode(e: KeyboardEvent) {
  switch (e.key) {
    case "j":
      array[caretData.atLine].active = false
      // make sure the caret stays within bounds vertically
      if (array.length > caretData.atLine + 1) {
        caretData.atLine++
        caretHBoundsAlign()
      }
      manageScrolling()
      array[caretData.atLine].active = true
      break
    case "k":
      array[caretData.atLine].active = false
      // make sure the caret stays within bounds vertically
      if (caretData.atLine > 0) {
        caretData.atLine--
        caretHBoundsAlign()
      }
      manageScrolling()
      array[caretData.atLine].active = true
      break
    case "h":
      // make sure the caret stays within bounds horizontally
      if (caretData.atLetter > 0) caretData.atLetter--
      // wrap to line above
      else if (caretData.atLine > 0) {
        array[caretData.atLine].active = false
        caretData.atLine--
        caretHMoveRight()
        manageScrolling()
        array[caretData.atLine].active = true
      }
      break
    case "l":
      // make sure the caret stays within bounds horizontally
      if (caretData.atLetter + 1 < array[caretData.atLine].txt.length) caretData.atLetter++
      // wrap to line beneath
      else if (caretData.atLine + 1 <= array.length - 1) {
        array[caretData.atLine].active = false
        caretData.atLine++
        caretData.atLetter = 0
        manageScrolling()
        array[caretData.atLine].active = true
      }
      break
    case "i":
      appState.mode = 'insert'
      caretData.insertFront = true
      break
    case "a":
      appState.mode = 'insert'
      if (array[caretData.atLine].txt.length !== 0) caretData.insertFront = false
      break
    case "o":
      array[caretData.atLine].active = false
      caretData.insertFront = false
      // add new line beneath caret
      array = array.slice(0, caretData.atLine + 1).concat([{ txt: '', active: true }], array.slice(caretData.atLine + 1))
      appState.mode = 'insert'
      caretData.atLetter = 0
      caretData.atLine++
      array[caretData.atLine].active = true
      manageScrolling()
      renderAll(appState.topLine, determineOptimalLinesToRender())
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
}

function visualMode(e: KeyboardEvent) {
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
}

function insertMode(e: KeyboardEvent) {
  if (e.key === 'Meta' || e.key === 'Shift' || e.key === 'Control' || e.key === 'CapsLock' || e.key === 'Alt') return
  e.preventDefault()
  switch (e.key) {
    case "Escape":
      if (caretData.insertFront && properties.behaviour.insertModeExitFront) {
        caretData.atLetter--
        caretHBoundsAlign()
      }
      appState.mode = 'normal'
      break
    case "Delete": // TODO: Fix end of line insertFront delete
      if (caretData.atLine !== array.length - 1) {
        if (array[caretData.atLine].txt.length === 0) {
          array[caretData.atLine].txt += array[caretData.atLine + 1].txt
          // remove line
          removeLineFromArr(caretData.atLine + 1)
          renderAll(appState.topLine, determineOptimalLinesToRender())
        } else if (caretData.atLetter === array[caretData.atLine].txt.length - 1 && caretData.insertFront === false) {
          array[caretData.atLine].txt += array[caretData.atLine + 1].txt
          // remove line
          removeLineFromArr(caretData.atLine + 1)
          renderAll(appState.topLine, determineOptimalLinesToRender())
        } else {
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1)) + array[caretData.atLine].txt.slice(caretData.atLetter + 1 + (caretData.insertFront ? 0 : 1))
        }
      }
      break
    case "Backspace":
      if (caretData.insertFront) {
        // remove character infront of caret
        if (caretData.atLetter === 0) {
          // move up a line
          // make sure caret stays within bounds vertically
          if (caretData.atLine > 0) {
            array[caretData.atLine].active = false
            caretData.atLine--
            if (appState.topLine > 0) appState.topLine--
            array[caretData.atLine].active = true
            caretHMoveRight()
            if (caretData.atLetter !== 0) caretData.insertFront = false
            array[caretData.atLine].txt += array[caretData.atLine + 1].txt
            // remove line
            removeLineFromArr(caretData.atLine + 1)
            renderAll(appState.topLine, determineOptimalLinesToRender())
          }
        } else {
          // remove letter infront of caret
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter - 1).concat(array[caretData.atLine].txt.slice(caretData.atLetter))
          caretData.atLetter--
        }
      } else {
        // remove character that is at same position as caret
        if (caretData.atLetter === 0) {
          if (array[caretData.atLine].txt.length > 1) {
            array[caretData.atLine].txt = array[caretData.atLine].txt.slice(1)
            caretData.insertFront = true
          } else {
            array[caretData.atLine].txt = ""
            caretData.insertFront = true
          }
        } else {
          array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter).concat(array[caretData.atLine].txt.slice(caretData.atLetter + 1))
          caretData.atLetter--
        }
      }
      break
    case "Enter":
      array[caretData.atLine].active = false
      array = array.slice(0, caretData.atLine + 1).concat([{ txt: array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1)), active: true }], array.slice(caretData.atLine + 1))
      array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1))
      caretData.insertFront = true
      caretData.atLetter = 0
      caretData.atLine++
      array[caretData.atLine].active = true
      manageScrolling()
      renderAll(appState.topLine, determineOptimalLinesToRender())
      break
    default:
      let k = e.key
      if (k === "Tab") k = "\t"
      if (array[caretData.atLine].txt.length > 0) {
        array[caretData.atLine].txt = array[caretData.atLine].txt.slice(0, caretData.atLetter + (caretData.insertFront ? 0 : 1)) + k + array[caretData.atLine].txt.slice(caretData.atLetter + (caretData.insertFront ? 0 : 1))
      } else {
        array[caretData.atLine].txt += k
      }
      caretData.atLetter++
      break
  }
}

// const range = new Range()
function eventListeners() {
  document.onkeydown = (e: KeyboardEvent) => {
    if (appState.mode === 'normal') normalMode(e)
    else if (appState.mode === 'visual') visualMode(e)
    else if (appState.mode === 'insert') insertMode(e)

    highlightLine()
    renderCaret()

    console.log(caretData)

    // manage selection
    // if (appState.selection.active) {
    //   if (caretData.atLine < appState.selection.from.line) {
    //     appState.selection.to.line = appState.selection.from.line
    //     appState.selection.to.letter = appState.selection.from.letter
    //     appState.selection.from.line = caretData.atLine
    //     appState.selection.from.letter = caretData.atLetter
    //   }
    //   if (appState.selection.from.line === caretData.atLine) range.setStart(txtbox.childNodes[caretData.atLine].childNodes[0].childNodes[0], appState.selection.from.letter)
    //   else if (appState.selection.from.line < appState.topLine) range.setStart(txtbox.childNodes[0].childNodes[0], 0)
    //   else range.setStart(txtbox.childNodes[appState.selection.from.line - appState.topLine].childNodes[0], appState.selection.from.letter)

    //   if (appState.selection.to.line === caretData.atLine) {
    //     let el = document.querySelector(".caret")
    //     if (!el) return
    //     range.setEnd(el, 0)
    //   } else if (appState.selection.to.line < appState.topLine) return
    //   else range.setEnd(txtbox.childNodes[appState.selection.to.line - appState.topLine].childNodes[0], appState.selection.to.letter)

    //   let selection = window.getSelection()
    //   selection?.removeAllRanges()
    //   selection?.addRange(range)
    // }
  }
}

async function main() {
  sampleText = await (await fetch('./sample.txt')).text()
  array = sampleText.split(/\n/g).map((line: string) => {
    return {
      txt: line,
      active: false
    }
  })

  const el = document.getElementById("textbox")
  if (el) txtbox = el as El
  else return
  eventListeners()
  updateCSS()
  renderAll(appState.topLine, appState.topLine + determineOptimalLinesToRender())
}

main()

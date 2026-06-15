
import './style.css'
import prism from 'prismjs'
import Editor, {
  BlockType,
  Command,
  ControlState,
  ControlType,
  EditorMode,
  EditorZone,
  ElementType,
  IBlock,
  ICatalogItem,
  IElement,
  KeyMap,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel,
  splitText
} from './editor'
import { Dialog } from './components/dialog/Dialog'
import { formatPrismToken } from './utils/prism'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick, scrollIntoView } from './utils'


const commentList: Array<{
  id: string
  content: string
  userName: string
  rangeText: string
  createdDate: string
}> = []
// let scrivenerFirstPageHeader: any[] = []
// let scrivenerDifferentFirstPage = false

window.onload = function () {
  const isApple = typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)

  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(
    container,
    {
      header: [{ value: 'Scrivener', size: 20, rowFlex: RowFlex.CENTER }],
      main: [{ value: '' }],
      footer: [{ value: 'Scrivener', size: 12 }]
    },
    {
      locale: 'en',
      margins: [96, 96, 96, 96],
      marginIndicatorSize: 0,
      pageNumber: {
        format: '{pageNo}/{pageCount}',
        size: 12,
        rowFlex: RowFlex.CENTER,
        bottom: 30
      }
    }
  )

  Reflect.set(window, 'editor', instance)
  const savedDoc = localStorage.getItem('scrivener-doc')
  if (savedDoc) {
    try {
      instance.command.executeSetValue(JSON.parse(savedDoc))
    } catch (e) { }
  }
  Reflect.set(window, '__CANVAS_EDITOR_INSTANCE__', instance)

  window.addEventListener('click', evt => {
    const visibleDom = document.querySelector('.visible')
    if (!visibleDom || visibleDom.contains(<Node>evt.target)) return
    visibleDom.classList.remove('visible')
  }, { capture: true })

  const saveStatusDom = document.querySelector<HTMLSpanElement>('#save-status')!

  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.title = `Undo (${isApple ? '⌘' : 'Ctrl'}+Z)`
  undoDom.onclick = () => instance.command.executeUndo()

  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.title = `Redo (${isApple ? '⌘' : 'Ctrl'}+Y)`
  redoDom.onclick = () => instance.command.executeRedo()

  const painterDom = document.querySelector<HTMLDivElement>('.menu-item__painter')!
  let isFirstClick = true
  let painterTimeout: number
  painterDom.onclick = function () {
    if (isFirstClick) {
      isFirstClick = false
      painterTimeout = window.setTimeout(() => {
        isFirstClick = true
        instance.command.executePainter({ isDblclick: false })
      }, 200)
    } else {
      window.clearTimeout(painterTimeout)
    }
  }
  painterDom.ondblclick = function () {
    isFirstClick = true
    window.clearTimeout(painterTimeout)
    instance.command.executePainter({ isDblclick: true })
  }

  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick = () => instance.command.executeFormat()

  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = () => fontOptionDom.classList.toggle('visible')
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }

  const sizeSetDom = document.querySelector<HTMLDivElement>('.menu-item__size')!
  const sizeSelectDom = sizeSetDom.querySelector<HTMLDivElement>('.select')!
  const sizeOptionDom = sizeSetDom.querySelector<HTMLDivElement>('.options')!
  sizeSetDom.title = 'Font Size'
  sizeSetDom.onclick = () => sizeOptionDom.classList.toggle('visible')
  sizeOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeSize(Number(li.dataset.size!))
  }

  const sizeAddDom = document.querySelector<HTMLDivElement>('.menu-item__size-add')!
  sizeAddDom.title = `Increase Font Size (${isApple ? '⌘' : 'Ctrl'}+[)`
  sizeAddDom.onclick = () => instance.command.executeSizeAdd()

  const sizeMinusDom = document.querySelector<HTMLDivElement>('.menu-item__size-minus')!
  sizeMinusDom.title = `Decrease Font Size (${isApple ? '⌘' : 'Ctrl'}+])`
  sizeMinusDom.onclick = () => instance.command.executeSizeMinus()

  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.title = `Bold (${isApple ? '⌘' : 'Ctrl'}+B)`
  boldDom.onclick = () => instance.command.executeBold()

  const italicDom = document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.title = `Italic (${isApple ? '⌘' : 'Ctrl'}+I)`
  italicDom.onclick = () => instance.command.executeItalic()

  const underlineDom = document.querySelector<HTMLDivElement>('.menu-item__underline')!
  underlineDom.title = `Underline (${isApple ? '⌘' : 'Ctrl'}+U)`
  const underlineOptionDom = underlineDom.querySelector<HTMLDivElement>('.options')!
  underlineDom.querySelector<HTMLSpanElement>('.select')!.onclick = () => underlineOptionDom.classList.toggle('visible')
  underlineDom.querySelector<HTMLElement>('i')!.onclick = function () {
    instance.command.executeUnderline()
    underlineOptionDom.classList.remove('visible')
  }
  underlineDom.querySelector<HTMLUListElement>('ul')!.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeUnderline({ style: <TextDecorationStyle>li.dataset.decorationStyle })
    underlineOptionDom.classList.remove('visible')
  }

  const strikeoutDom = document.querySelector<HTMLDivElement>('.menu-item__strikeout')!
  strikeoutDom.onclick = () => instance.command.executeStrikeout()

  const superscriptDom = document.querySelector<HTMLDivElement>('.menu-item__superscript')!
  superscriptDom.title = `Superscript (${isApple ? '⌘' : 'Ctrl'}+Shift+,)`
  superscriptDom.onclick = () => instance.command.executeSuperscript()

  const subscriptDom = document.querySelector<HTMLDivElement>('.menu-item__subscript')!
  subscriptDom.title = `Subscript (${isApple ? '⌘' : 'Ctrl'}+Shift+.)`
  subscriptDom.onclick = () => instance.command.executeSubscript()

  const colorControlDom = document.querySelector<HTMLInputElement>('#color')!
  colorControlDom.oninput = () => instance.command.executeColor(colorControlDom.value)
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = () => colorControlDom.click()

  const highlightControlDom = document.querySelector<HTMLInputElement>('#highlight')!
  highlightControlDom.oninput = () => instance.command.executeHighlight(highlightControlDom.value)
  const highlightDom = document.querySelector<HTMLDivElement>('.menu-item__highlight')!
  const highlightSpanDom = highlightDom.querySelector('span')!
  highlightDom.onclick = () => highlightControlDom?.click()

  const titleDom = document.querySelector<HTMLDivElement>('.menu-item__title')!
  const titleSelectDom = titleDom.querySelector<HTMLDivElement>('.select')!
  const titleOptionDom = titleDom.querySelector<HTMLDivElement>('.options')!
  titleOptionDom.querySelectorAll('li').forEach((li, index) => {
    li.title = `Ctrl+${isApple ? 'Option' : 'Alt'}+${index}`
  })
  titleDom.onclick = () => titleOptionDom.classList.toggle('visible')
  titleOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeTitle(<TitleLevel>li.dataset.level || null)
  }

  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.title = `Align Left (${isApple ? '⌘' : 'Ctrl'}+L)`
  leftDom.onclick = () => instance.command.executeRowFlex(RowFlex.LEFT)

  const centerDom = document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.title = `Center (${isApple ? '⌘' : 'Ctrl'}+E)`
  centerDom.onclick = () => instance.command.executeRowFlex(RowFlex.CENTER)

  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.title = `Align Right (${isApple ? '⌘' : 'Ctrl'}+R)`
  rightDom.onclick = () => instance.command.executeRowFlex(RowFlex.RIGHT)

  const alignmentDom = document.querySelector<HTMLDivElement>('.menu-item__alignment')!
  alignmentDom.title = `Justify (${isApple ? '⌘' : 'Ctrl'}+J)`
  alignmentDom.onclick = () => instance.command.executeRowFlex(RowFlex.ALIGNMENT)

  const justifyDom = document.querySelector<HTMLDivElement>('.menu-item__justify')!
  justifyDom.title = `Distributed (${isApple ? '⌘' : 'Ctrl'}+Shift+J)`
  justifyDom.onclick = () => instance.command.executeRowFlex(RowFlex.JUSTIFY)

  const rowMarginDom = document.querySelector<HTMLDivElement>('.menu-item__row-margin')!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = () => rowOptionDom.classList.toggle('visible')
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }

  const listDom = document.querySelector<HTMLDivElement>('.menu-item__list')!
  listDom.title = `List (${isApple ? '⌘' : 'Ctrl'}+Shift+U)`
  const listOptionDom = listDom.querySelector<HTMLDivElement>('.options')!
  listDom.onclick = () => listOptionDom.classList.toggle('visible')
  listOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const listType = <ListType>li.dataset.listType || null
    const listStyle = <ListStyle>(<unknown>li.dataset.listStyle)
    instance.command.executeList(listType, listStyle)
  }

  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>('.menu-item__table__collapse')!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => tr.forEach(td => td.classList.remove('active')))
  }
  function setTableTitle(payload: string) { tableTitle.innerText = payload }
  function recoveryTable() {
    removeAllTableCellSelect()
    setTableTitle('Insert')
    colIndex = 0
    rowIndex = 0
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = () => { tablePanelContainer!.style.display = 'block' }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16, rowMarginTop = 10, celMarginRight = 6
    const { offsetX, offsetY } = evt
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) td.classList.add('active')
      })
    })
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = () => recoveryTable()
  tablePanel.onclick = function () {
    instance.command.executeInsertTable(rowIndex, colIndex)
    recoveryTable()
  }

  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
  const imageFileDom = document.querySelector<HTMLInputElement>('#image')!
  imageDom.onclick = () => imageFileDom.click()
  imageFileDom.onchange = function () {
    const file = imageFileDom.files![0]!
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = function () {
      const image = new Image()
      const value = fileReader.result as string
      image.src = value
      image.onload = function () {
        instance.command.executeImage({ value, width: image.width, height: image.height })
        imageFileDom.value = ''
      }
    }
  }

  const hyperlinkDom = document.querySelector<HTMLDivElement>('.menu-item__hyperlink')!
  hyperlinkDom.onclick = function () {
    new Dialog({
      title: 'Hyperlink',
      data: [
        { type: 'text', label: 'Text', name: 'name', required: true, placeholder: 'Enter text', value: instance.command.getRangeText() },
        { type: 'text', label: 'URL', name: 'url', required: true, placeholder: 'Enter URL' }
      ],
      onConfirm: payload => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({ url, valueList: splitText(name).map(n => ({ value: n, size: 16 })) })
      }
    })
  }

  const separatorDom = document.querySelector<HTMLDivElement>('.menu-item__separator')!
  const separatorOptionDom = separatorDom.querySelector<HTMLDivElement>('.options')!
  separatorDom.onclick = () => separatorOptionDom.classList.toggle('visible')
  separatorOptionDom.onmousedown = function (evt) {
    let payload: number[] = []
    const li = evt.target as HTMLLIElement
    const separatorDash = li.dataset.separator?.split(',').map(Number)
    if (separatorDash) {
      const isSingleLine = separatorDash.every(d => d === 0)
      if (!isSingleLine) payload = separatorDash
    }
    instance.command.executeSeparator(payload)
  }

  const pageBreakDom = document.querySelector<HTMLDivElement>('.menu-item__page-break')!
  pageBreakDom.onclick = () => instance.command.executePageBreak()

  const watermarkDom = document.querySelector<HTMLDivElement>('.menu-item__watermark')!
  const watermarkOptionDom = watermarkDom.querySelector<HTMLDivElement>('.options')!
  watermarkDom.onclick = () => watermarkOptionDom.classList.toggle('visible')
  watermarkOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const menu = li.dataset.menu!
    watermarkOptionDom.classList.toggle('visible')
    if (menu === 'add') {
      new Dialog({
        title: 'Watermark',
        data: [
          { type: 'text', label: 'Text', name: 'data', required: true, placeholder: 'Enter watermark text' },
          { type: 'color', label: 'Color', name: 'color', required: true, value: '#AEB5C0' },
          { type: 'number', label: 'Font Size', name: 'size', required: true, value: '120' },
          { type: 'number', label: 'Opacity', name: 'opacity', required: true, value: '0.3' },
          { type: 'select', label: 'Repeat', name: 'repeat', value: '0', required: false, options: [{ label: 'No Repeat', value: '0' }, { label: 'Repeat', value: '1' }] },
          { type: 'number', label: 'Horizontal Gap', name: 'horizontalGap', required: false, value: '10' },
          { type: 'number', label: 'Vertical Gap', name: 'verticalGap', required: false, value: '10' }
        ],
        onConfirm: payload => {
          const nullableIndex = payload.findIndex(p => !p.value)
          if (~nullableIndex) return
          const watermark = payload.reduce((pre, cur) => { pre[cur.name] = cur.value; return pre }, <any>{})
          const repeat = watermark.repeat === '1'
          instance.command.executeAddWatermark({
            data: watermark.data, color: watermark.color,
            size: Number(watermark.size), opacity: Number(watermark.opacity), repeat,
            gap: repeat && watermark.horizontalGap && watermark.verticalGap ? [Number(watermark.horizontalGap), Number(watermark.verticalGap)] : undefined
          })
        }
      })
    } else {
      instance.command.executeDeleteWatermark()
    }
  }

  const codeblockDom = document.querySelector<HTMLDivElement>('.menu-item__codeblock')!
  codeblockDom.onclick = function () {
    new Dialog({
      title: 'Code Block',
      data: [{ type: 'textarea', name: 'codeblock', placeholder: 'Enter code...', width: 500, height: 300 }],
      onConfirm: payload => {
        const codeblock = payload.find(p => p.name === 'codeblock')?.value
        if (!codeblock) return
        const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
        const formatTokenList = formatPrismToken(tokenList)
        const elementList: IElement[] = []
        for (const formatToken of formatTokenList) {
          for (const value of splitText(formatToken.content)) {
            const element: IElement = { value }
            if (formatToken.color) element.color = formatToken.color
            if (formatToken.bold) element.bold = true
            if (formatToken.italic) element.italic = true
            elementList.push(element)
          }
        }
        elementList.unshift({ value: '\n' })
        instance.command.executeInsertElementList(elementList)
      }
    })
  }

  const controlDom = document.querySelector<HTMLDivElement>('.menu-item__control')!
  const controlOptionDom = controlDom.querySelector<HTMLDivElement>('.options')!
  controlDom.onclick = () => controlOptionDom.classList.toggle('visible')
  controlOptionDom.onmousedown = function (evt) {
    controlOptionDom.classList.toggle('visible')
    const li = evt.target as HTMLLIElement
    const type = <ControlType>li.dataset.control
    switch (type) {
      case ControlType.TEXT:
        new Dialog({
          title: 'Text Control',
          data: [
            { type: 'text', label: 'Placeholder', name: 'placeholder', required: true, placeholder: 'Enter placeholder' },
            { type: 'text', label: 'Default Value', name: 'value', placeholder: 'Enter default value' }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(p => p.name === 'placeholder')?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, value: value ? [{ value }] : null, placeholder } })
          }
        })
        break
      case ControlType.SELECT:
        new Dialog({
          title: 'Select Control',
          data: [
            { type: 'text', label: 'Placeholder', name: 'placeholder', required: true, placeholder: 'Enter placeholder' },
            { type: 'text', label: 'Default Value', name: 'code', placeholder: 'Enter default value' },
            { type: 'textarea', label: 'Value Sets', name: 'valueSets', required: true, height: 100, placeholder: 'Enter JSON value sets' }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(p => p.name === 'placeholder')?.value
            if (!placeholder) return
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, code, value: null, placeholder, valueSets: JSON.parse(valueSets) } })
          }
        })
        break
      case ControlType.CHECKBOX:
        new Dialog({
          title: 'Checkbox Control',
          data: [
            { type: 'text', label: 'Default Value', name: 'code', placeholder: 'Comma-separated default values' },
            { type: 'textarea', label: 'Value Sets', name: 'valueSets', required: true, height: 100, placeholder: 'Enter JSON value sets' }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, code, value: null, valueSets: JSON.parse(valueSets) } })
          }
        })
        break
      case ControlType.RADIO:
        new Dialog({
          title: 'Radio Control',
          data: [
            { type: 'text', label: 'Default Value', name: 'code', placeholder: 'Enter default value' },
            { type: 'textarea', label: 'Value Sets', name: 'valueSets', required: true, height: 100, placeholder: 'Enter JSON value sets' }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, code, value: null, valueSets: JSON.parse(valueSets) } })
          }
        })
        break
      case ControlType.DATE:
        new Dialog({
          title: 'Date Control',
          data: [
            { type: 'text', label: 'Placeholder', name: 'placeholder', required: true, placeholder: 'Enter placeholder' },
            { type: 'text', label: 'Default Value', name: 'value', placeholder: 'Enter default value' },
            { type: 'select', label: 'Date Format', name: 'dateFormat', value: 'yyyy-MM-dd hh:mm:ss', required: true, options: [{ label: 'yyyy-MM-dd hh:mm:ss', value: 'yyyy-MM-dd hh:mm:ss' }, { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' }] }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(p => p.name === 'placeholder')?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            const dateFormat = payload.find(p => p.name === 'dateFormat')?.value || ''
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, dateFormat, value: value ? [{ value }] : null, placeholder } })
          }
        })
        break
      case ControlType.NUMBER:
        new Dialog({
          title: 'Number Control',
          data: [
            { type: 'text', label: 'Placeholder', name: 'placeholder', required: true, placeholder: 'Enter placeholder' },
            { type: 'text', label: 'Default Value', name: 'value', placeholder: 'Enter default value' }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(p => p.name === 'placeholder')?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({ type: ElementType.CONTROL, value: '', control: { type, value: value ? [{ value }] : null, placeholder } })
          }
        })
        break
    }
  }

  const checkboxDom = document.querySelector<HTMLDivElement>('.menu-item__checkbox')!
  checkboxDom.onclick = () => instance.command.executeInsertElementList([{ type: ElementType.CHECKBOX, checkbox: { value: false }, value: '' }])

  const radioDom = document.querySelector<HTMLDivElement>('.menu-item__radio')!
  radioDom.onclick = () => instance.command.executeInsertElementList([{ type: ElementType.RADIO, checkbox: { value: false }, value: '' }])

  const latexDom = document.querySelector<HTMLDivElement>('.menu-item__latex')!
  latexDom.onclick = function () {
    new Dialog({
      title: 'LaTeX',
      data: [{ type: 'textarea', height: 100, name: 'value', placeholder: 'Enter LaTeX expression' }],
      onConfirm: payload => {
        const value = payload.find(p => p.name === 'value')?.value
        if (!value) return
        instance.command.executeInsertElementList([{ type: ElementType.LATEX, value }])
      }
    })
  }

  const dateDom = document.querySelector<HTMLDivElement>('.menu-item__date')!
  const dateDomOptionDom = dateDom.querySelector<HTMLDivElement>('.options')!
  dateDom.onclick = function () {
    dateDomOptionDom.classList.toggle('visible')
    const bodyRect = document.body.getBoundingClientRect()
    const dateDomOptionRect = dateDomOptionDom.getBoundingClientRect()
    if (dateDomOptionRect.left + dateDomOptionRect.width > bodyRect.width) {
      dateDomOptionDom.style.right = '0px'
      dateDomOptionDom.style.left = 'unset'
    } else {
      dateDomOptionDom.style.right = 'unset'
      dateDomOptionDom.style.left = '0px'
    }
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dateTimeString = `${dateString} ${hour}:${minute}:${second}`
    dateDomOptionDom.querySelector<HTMLLIElement>('li:first-child')!.innerText = dateString
    dateDomOptionDom.querySelector<HTMLLIElement>('li:last-child')!.innerText = dateTimeString
  }
  dateDomOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const dateFormat = li.dataset.format!
    dateDomOptionDom.classList.toggle('visible')
    instance.command.executeInsertElementList([{ type: ElementType.DATE, value: '', dateFormat, valueList: [{ value: li.innerText.trim() }] }])
  }

  const blockDom = document.querySelector<HTMLDivElement>('.menu-item__block')!
  blockDom.onclick = function () {
    new Dialog({
      title: 'Content Block',
      data: [
        { type: 'select', label: 'Type', name: 'type', value: 'iframe', required: true, options: [{ label: 'Website', value: 'iframe' }, { label: 'Video', value: 'video' }] },
        { type: 'number', label: 'Width', name: 'width', placeholder: 'Enter width (default: page width)' },
        { type: 'number', label: 'Height', name: 'height', required: true, placeholder: 'Enter height' },
        { type: 'input', label: 'URL', name: 'src', required: false, placeholder: 'Enter URL' },
        { type: 'textarea', label: 'HTML', height: 100, name: 'srcdoc', required: false, placeholder: 'Enter HTML code (iframe only)' }
      ],
      onConfirm: payload => {
        const type = payload.find(p => p.name === 'type')?.value
        if (!type) return
        const width = payload.find(p => p.name === 'width')?.value
        const height = payload.find(p => p.name === 'height')?.value
        if (!height) return
        const src = payload.find(p => p.name === 'src')?.value
        const srcdoc = payload.find(p => p.name === 'srcdoc')?.value
        const block: IBlock = { type: <BlockType>type }
        if (block.type === BlockType.IFRAME) {
          if (!src && !srcdoc) return
          block.iframeBlock = { src, srcdoc }
        } else if (block.type === BlockType.VIDEO) {
          if (!src) return
          block.videoBlock = { src }
        }
        const blockElement: IElement = { type: ElementType.BLOCK, value: '', height: Number(height), block }
        if (width) blockElement.width = Number(width)
        instance.command.executeInsertElementList([blockElement])
      }
    })
  }

  const searchCollapseDom = document.querySelector<HTMLDivElement>('.menu-item__search__collapse')!
  const searchInputDom = document.querySelector<HTMLInputElement>('.menu-item__search__collapse__search input')!
  const replaceInputDom = document.querySelector<HTMLInputElement>('.menu-item__search__collapse__replace input')!
  const searchRegInputDom = document.querySelector<HTMLInputElement>('#option-reg')!
  const searchCaseInputDom = document.querySelector<HTMLInputElement>('#option-case')!
  const searchSelectionInputDom = document.querySelector<HTMLInputElement>('#option-selection')!
  const searchDom = document.querySelector<HTMLDivElement>('.menu-item__search')!
  searchDom.title = `Search & Replace (${isApple ? '⌘' : 'Ctrl'}+F)`
  const searchResultDom = searchCollapseDom.querySelector<HTMLLabelElement>('.search-result')!

  function setSearchResult() {
    const result = instance.command.getSearchNavigateInfo()
    if (result) {
      const { index, count } = result
      searchResultDom.innerText = `${index}/${count}`
    } else {
      searchResultDom.innerText = ''
    }
  }

  searchDom.onclick = function () {
    searchCollapseDom.style.display = 'block'
    const bodyRect = document.body.getBoundingClientRect()
    const searchRect = searchDom.getBoundingClientRect()
    const searchCollapseRect = searchCollapseDom.getBoundingClientRect()
    if (searchRect.left + searchCollapseRect.width > bodyRect.width) {
      searchCollapseDom.style.right = '0px'
      searchCollapseDom.style.left = 'unset'
    } else {
      searchCollapseDom.style.right = 'unset'
    }
    searchInputDom.focus()
  }

  searchCollapseDom.querySelector<HTMLSpanElement>('span')!.onclick = function () {
    searchCollapseDom.style.display = 'none'
    searchInputDom.value = ''
    replaceInputDom.value = ''
    instance.command.executeSearch(null)
    setSearchResult()
  }

  function emitSearch() {
    instance.command.executeSearch(searchInputDom.value || null, {
      isRegEnable: searchRegInputDom.checked,
      isIgnoreCase: searchCaseInputDom.checked,
      isLimitSelection: searchSelectionInputDom.checked
    })
    setSearchResult()
  }

  searchInputDom.oninput = emitSearch
  searchRegInputDom.onchange = emitSearch
  searchCaseInputDom.onchange = emitSearch
  searchSelectionInputDom.onchange = emitSearch
  searchInputDom.onkeydown = evt => { if (evt.key === 'Enter') emitSearch() }

  searchCollapseDom.querySelector<HTMLButtonElement>('button')!.onclick = function () {
    const searchValue = searchInputDom.value
    const replaceValue = replaceInputDom.value
    if (searchValue && searchValue !== replaceValue) instance.command.executeReplace(replaceValue)
  }

  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-left')!.onclick = function () {
    instance.command.executeSearchNavigatePre()
    setSearchResult()
  }

  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-right')!.onclick = function () {
    instance.command.executeSearchNavigateNext()
    setSearchResult()
  }

  const printDom = document.querySelector<HTMLDivElement>('.menu-item__print')!
  printDom.title = `Print (${isApple ? '⌘' : 'Ctrl'}+P)`
  printDom.onclick = () => instance.command.executePrint()

  const editorOptionDom = document.querySelector<HTMLDivElement>('.editor-option')!
  editorOptionDom.onclick = function () {
    const options = instance.command.getOptions()
    new Dialog({
      title: 'Editor Settings',
      data: [{ type: 'textarea', name: 'option', width: 350, height: 300, required: true, value: JSON.stringify(options, null, 2), placeholder: 'Enter editor config JSON' }],
      onConfirm: payload => {
        const newOptionValue = payload.find(p => p.name === 'option')?.value
        if (!newOptionValue) return
        instance.command.executeUpdateOptions(JSON.parse(newOptionValue))
      }
    })
  }

  async function updateCatalog() {
    const catalog = await instance.command.getCatalog()
    const catalogMainDom = document.querySelector<HTMLDivElement>('.catalog__main')!
    catalogMainDom.innerHTML = ''
    if (catalog) {
      const appendCatalog = (parent: HTMLDivElement, catalogItems: ICatalogItem[]) => {
        for (const catalogItem of catalogItems) {
          const catalogItemDom = document.createElement('div')
          catalogItemDom.classList.add('catalog-item')
          const catalogItemContentDom = document.createElement('div')
          catalogItemContentDom.classList.add('catalog-item__content')
          const span = document.createElement('span')
          span.innerText = catalogItem.name
          catalogItemContentDom.append(span)
          catalogItemContentDom.onclick = () => instance.command.executeLocationCatalog(catalogItem.id)
          catalogItemDom.append(catalogItemContentDom)
          if (catalogItem.subCatalog?.length) appendCatalog(catalogItemDom, catalogItem.subCatalog)
          parent.append(catalogItemDom)
        }
      }
      appendCatalog(catalogMainDom, catalog)
    }
  }

  let isCatalogShow = true
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const catalogModeDom = document.querySelector<HTMLDivElement>('.catalog-mode')!
  const catalogHeaderCloseDom = document.querySelector<HTMLDivElement>('.catalog__header__close')!
  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    catalogDom.style.display = isCatalogShow ? 'block' : 'none'
    if (isCatalogShow) updateCatalog()
  }
  catalogModeDom.onclick = switchCatalog
  catalogHeaderCloseDom.onclick = switchCatalog

  const pageModeDom = document.querySelector<HTMLDivElement>('.page-mode')!
  const pageModeOptionsDom = pageModeDom.querySelector<HTMLDivElement>('.options')!
  pageModeDom.onclick = () => pageModeOptionsDom.classList.toggle('visible')
  pageModeOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePageMode(<PageMode>li.dataset.pageMode!)
  }

  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick = () => instance.command.executePageScaleRecovery()
  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick = () => instance.command.executePageScaleMinus()
  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick = () => instance.command.executePageScaleAdd()

  const paperSizeDom = document.querySelector<HTMLDivElement>('.paper-size')!
  const paperSizeDomOptionsDom = paperSizeDom.querySelector<HTMLDivElement>('.options')!
  paperSizeDom.onclick = () => paperSizeDomOptionsDom.classList.toggle('visible')
  paperSizeDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const [width, height] = li.dataset.paperSize!.split('*').map(Number)
    instance.command.executePaperSize(width, height)
    paperSizeDomOptionsDom.querySelectorAll('li').forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  const paperDirectionDom = document.querySelector<HTMLDivElement>('.paper-direction')!
  const paperDirectionDomOptionsDom = paperDirectionDom.querySelector<HTMLDivElement>('.options')!
  paperDirectionDom.onclick = () => paperDirectionDomOptionsDom.classList.toggle('visible')
  paperDirectionDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePaperDirection(<PaperDirection>li.dataset.paperDirection!)
    paperDirectionDomOptionsDom.querySelectorAll('li').forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  const paperMarginDom = document.querySelector<HTMLDivElement>('.paper-margin')!
  paperMarginDom.onclick = function () {
    const [topMargin, rightMargin, bottomMargin, leftMargin] = instance.command.getPaperMargin()
    new Dialog({
      title: 'Page Margins',
      data: [
        { type: 'text', label: 'Top', name: 'top', required: true, value: `${topMargin}`, placeholder: 'Enter top margin' },
        { type: 'text', label: 'Bottom', name: 'bottom', required: true, value: `${bottomMargin}`, placeholder: 'Enter bottom margin' },
        { type: 'text', label: 'Left', name: 'left', required: true, value: `${leftMargin}`, placeholder: 'Enter left margin' },
        { type: 'text', label: 'Right', name: 'right', required: true, value: `${rightMargin}`, placeholder: 'Enter right margin' }
      ],
      onConfirm: payload => {
        const top = payload.find(p => p.name === 'top')?.value
        const bottom = payload.find(p => p.name === 'bottom')?.value
        const left = payload.find(p => p.name === 'left')?.value
        const right = payload.find(p => p.name === 'right')?.value
        if (!top || !bottom || !left || !right) return
        instance.command.executeSetPaperMargin([Number(top), Number(right), Number(bottom), Number(left)])
      }
    })
  }

  const fullscreenDom = document.querySelector<HTMLDivElement>('.fullscreen')!
  fullscreenDom.onclick = toggleFullscreen
  window.addEventListener('keydown', evt => { if (evt.key === 'F11') { toggleFullscreen(); evt.preventDefault() } })
  document.addEventListener('fullscreenchange', () => fullscreenDom.classList.toggle('exist'))
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  let modeIndex = 0
  const modeList = [
    { mode: EditorMode.EDIT, name: 'Edit Mode' },
    { mode: EditorMode.CLEAN, name: 'Clean Mode' },
    { mode: EditorMode.READONLY, name: 'Read Only' },
    { mode: EditorMode.FORM, name: 'Form Mode' },
    { mode: EditorMode.PRINT, name: 'Print Mode' },
    { mode: EditorMode.DESIGN, name: 'Design Mode' },
    { mode: EditorMode.GRAFFITI, name: 'Graffiti Mode' }
  ]
  const modeElement = document.querySelector<HTMLDivElement>('.editor-mode')!
  modeElement.onclick = function () {
    modeIndex === modeList.length - 1 ? (modeIndex = 0) : modeIndex++
    const { name, mode } = modeList[modeIndex]
    modeElement.innerText = name
    instance.command.executeMode(mode)
    const isReadonly = mode === EditorMode.READONLY
    const enableMenuList = ['search', 'print']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu)) ? dom.classList.add('disable') : dom.classList.remove('disable')
    })
  }

  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  async function updateComment() {
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(`.comment-item[data-id='${comment.id}']`)
      if (groupIds.includes(comment.id)) {
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => instance.command.executeLocationGroup(comment.id)
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const titleContent = document.createElement('span')
          titleContent.innerText = comment.rangeText
          commentItemTitle.append(titleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => instance.command.executeDeleteGroup(comment.id)
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const nameSpan = document.createElement('span')
          nameSpan.innerText = comment.userName
          const dateSpan = document.createElement('span')
          dateSpan.innerText = comment.createdDate
          commentItemInfo.append(nameSpan, dateSpan)
          commentItem.append(commentItemInfo)
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        activeCommentDom?.remove()
      }
    }
  }

  instance.listener.rangeStyleChange = function (payload) {
    payload.type === ElementType.SUBSCRIPT ? subscriptDom.classList.add('active') : subscriptDom.classList.remove('active')
    payload.type === ElementType.SUPERSCRIPT ? superscriptDom.classList.add('active') : superscriptDom.classList.remove('active')
    payload.type === ElementType.SEPARATOR ? separatorDom.classList.add('active') : separatorDom.classList.remove('active')
    separatorOptionDom.querySelectorAll('li').forEach(li => li.classList.remove('active'))
    if (payload.type === ElementType.SEPARATOR) {
      const separator = payload.dashArray.join(',') || '0,0'
      const curSeparatorDom = separatorOptionDom.querySelector<HTMLLIElement>(`[data-separator='${separator}']`)
      if (curSeparatorDom) curSeparatorDom.classList.add('active')
    }
    fontOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(`[data-family='${payload.font}']`)
    if (curFontDom) { fontSelectDom.innerText = curFontDom.innerText; fontSelectDom.style.fontFamily = payload.font; curFontDom.classList.add('active') }
    sizeOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    const curSizeDom = sizeOptionDom.querySelector<HTMLLIElement>(`[data-size='${payload.size}']`)
    if (curSizeDom) { sizeSelectDom.innerText = curSizeDom.innerText; curSizeDom.classList.add('active') }
    else sizeSelectDom.innerText = `${payload.size}`
    payload.bold ? boldDom.classList.add('active') : boldDom.classList.remove('active')
    payload.italic ? italicDom.classList.add('active') : italicDom.classList.remove('active')
    payload.underline ? underlineDom.classList.add('active') : underlineDom.classList.remove('active')
    payload.strikeout ? strikeoutDom.classList.add('active') : strikeoutDom.classList.remove('active')
    if (payload.color) { colorDom.classList.add('active'); colorControlDom.value = payload.color; colorSpanDom.style.backgroundColor = payload.color }
    else { colorDom.classList.remove('active'); colorControlDom.value = '#000000'; colorSpanDom.style.backgroundColor = '#000000' }
    if (payload.highlight) { highlightDom.classList.add('active'); highlightControlDom.value = payload.highlight; highlightSpanDom.style.backgroundColor = payload.highlight }
    else { highlightDom.classList.remove('active'); highlightControlDom.value = '#ffff00'; highlightSpanDom.style.backgroundColor = '#ffff00' }
    leftDom.classList.remove('active'); centerDom.classList.remove('active'); rightDom.classList.remove('active'); alignmentDom.classList.remove('active'); justifyDom.classList.remove('active')
    if (payload.rowFlex === 'right') rightDom.classList.add('active')
    else if (payload.rowFlex === 'center') centerDom.classList.add('active')
    else if (payload.rowFlex === 'alignment') alignmentDom.classList.add('active')
    else if (payload.rowFlex === 'justify') justifyDom.classList.add('active')
    else leftDom.classList.add('active')
    rowOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(`[data-rowmargin='${payload.rowMargin}']`)
    curRowMarginDom?.classList.add('active')
    payload.undo ? undoDom.classList.remove('no-allow') : undoDom.classList.add('no-allow')
    payload.redo ? redoDom.classList.remove('no-allow') : redoDom.classList.add('no-allow')
    payload.painter ? painterDom.classList.add('active') : painterDom.classList.remove('active')
    titleOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    if (payload.level) {
      const curTitleDom = titleOptionDom.querySelector<HTMLLIElement>(`[data-level='${payload.level}']`)!
      titleSelectDom.innerText = curTitleDom.innerText
      curTitleDom.classList.add('active')
    } else {
      titleSelectDom.innerText = 'Normal'
      titleOptionDom.querySelector('li:first-child')!.classList.add('active')
    }
    listOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    if (payload.listType) {
      listDom.classList.add('active')
      const listStyle = payload.listType === ListType.OL ? ListStyle.DECIMAL : payload.listType
      const curListDom = listOptionDom.querySelector<HTMLLIElement>(`[data-list-type='${payload.listType}'][data-list-style='${listStyle}']`)
      if (curListDom) curListDom.classList.add('active')
    } else { listDom.classList.remove('active') }
    commentDom.querySelectorAll<HTMLDivElement>('.comment-item').forEach(d => d.classList.remove('active'))
    if (payload.groupIds) {
      const [id] = payload.groupIds
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(`.comment-item[data-id='${id}']`)
      if (activeCommentDom) { activeCommentDom.classList.add('active'); scrollIntoView(commentDom, activeCommentDom) }
    }
    const rangeContext = instance.command.getRangeContext()
    if (rangeContext) {
      document.querySelector<HTMLSpanElement>('.row-no')!.innerText = `${rangeContext.startRowNo + 1}`
      document.querySelector<HTMLSpanElement>('.col-no')!.innerText = `${rangeContext.startColNo + 1}`
    }
  }

  instance.listener.visiblePageNoListChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = payload.map(i => i + 1).join(', ')
  }
  instance.listener.pageSizeChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-size')!.innerText = `${payload}`
  }
  instance.listener.intersectionPageNoChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${payload + 1}`
  }
  instance.listener.pageScaleChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-scale-percentage')!.innerText = `${Math.floor(payload * 100)}%`
  }
  instance.listener.controlChange = function (payload) {
    const disableMenus = ['table', 'hyperlink', 'separator', 'page-break', 'control']
    disableMenus.forEach(menu => {
      const menuDom = document.querySelector<HTMLDivElement>(`.menu-item__${menu}`)!
      payload.state === ControlState.ACTIVE ? menuDom.classList.add('disable') : menuDom.classList.remove('disable')
    })
  }
  instance.listener.pageModeChange = function (payload) {
    const activeMode = pageModeOptionsDom.querySelector<HTMLLIElement>(`[data-page-mode='${payload}']`)!
    pageModeOptionsDom.querySelectorAll('li').forEach(li => li.classList.remove('active'))
    activeMode.classList.add('active')
  }

  const handleContentChange = async function () {
    const wordCount = await instance.command.getWordCount()
    document.querySelector<HTMLSpanElement>('.word-count')!.innerText = `${wordCount || 0}`
    if (isCatalogShow) nextTick(() => updateCatalog())
    nextTick(() => updateComment())
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()
  instance.listener.saved = function (payload) {
    saveStatusDom.innerText = 'Saving...'
    saveStatusDom.style.color = '#f59e0b'
    localStorage.setItem('scrivener-doc', JSON.stringify(payload))
    setTimeout(() => {
      saveStatusDom.innerText = '✓ Saved'
      saveStatusDom.style.color = '#22c55e'
    }, 500)
  }

  instance.register.contextMenuList([
    {
      name: 'Comment',
      when: payload => !payload.isReadonly && payload.editorHasSelection && payload.zone === EditorZone.MAIN,
      callback: (command: Command) => {
        new Dialog({
          title: 'Add Comment',
          data: [{ type: 'textarea', label: 'Comment', height: 100, name: 'value', required: true, placeholder: 'Enter your comment...' }],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({ id: groupId, content: value, userName: 'User', rangeText: command.getRangeText(), createdDate: new Date().toLocaleString() })
          }
        })
      }
    },
    {
      name: 'Add Caption', icon: 'caption',
      when: payload => !payload.isReadonly && payload.startElement?.type === ElementType.IMAGE && !payload.startElement?.imgCaption,
      callback: (command: Command) => {
        new Dialog({
          title: 'Add Caption',
          data: [{ type: 'text', label: 'Caption', name: 'value', required: true, placeholder: 'Enter caption (use {imageNo} for image number)' }],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            command.executeSetImageCaption({ value })
          }
        })
      }
    },
    {
      name: 'Edit Caption', icon: 'caption',
      when: payload => !payload.isReadonly && payload.startElement?.type === ElementType.IMAGE && !!payload.startElement?.imgCaption,
      callback: (command: Command, context) => {
        const currentCaption = context.startElement?.imgCaption
        new Dialog({
          title: 'Edit Caption',
          data: [{ type: 'text', label: 'Caption', name: 'value', required: true, value: currentCaption?.value, placeholder: 'Enter caption' }],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            command.executeSetImageCaption({ ...currentCaption, value: value || '' })
          }
        })
      }
    },
    {
      name: 'Signature', icon: 'signature',
      when: payload => !payload.isReadonly && payload.editorTextFocus,
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([{ value, width, height, type: ElementType.IMAGE }])
          }
        })
      }
    },
    {
      name: 'Format Document', icon: 'word-tool',
      when: payload => !payload.isReadonly,
      callback: (command: Command) => command.executeWordTool()
    },
    {
      name: 'Clear Graffiti',
      when: payload => payload.options.mode === EditorMode.GRAFFITI,
      callback: (command: Command) => command.executeClearGraffiti()
    },
    {
      name: 'Page Background',
      when: () => true,
      callback: () => {
        const input = document.createElement('input')
        input.type = 'color'
        input.value = '#ffffff'
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.click()
        input.oninput = () => {
          instance.command.executeUpdateOptions({
            background: { color: input.value }
          })
        }
        input.onchange = () => {
          document.body.removeChild(input)
        }
      }
    },
    {
      name: 'Header Background',
      when: () => true,
      callback: () => {
        const input = document.createElement('input')
        input.type = 'color'
        input.value = '#ffffff'
        input.style.cssText = 'position:fixed;opacity:0;width:0;height:0;'
        document.body.appendChild(input)
        input.click()
        input.oninput = () => {
          instance.command.executeUpdateOptions({
            headerBackground: input.value
          } as any)
        }
        input.onchange = () => document.body.removeChild(input)
      }
    },
    {
      name: 'Footer Background',
      when: () => true,
      callback: () => {
        const input = document.createElement('input')
        input.type = 'color'
        input.value = '#ffffff'
        input.style.cssText = 'position:fixed;opacity:0;width:0;height:0;'
        document.body.appendChild(input)
        input.click()
        input.oninput = () => {
          instance.command.executeUpdateOptions({
            footerBackground: input.value
          } as any)
        }
        input.onchange = () => document.body.removeChild(input)
      }
    },
    // {
    //   name: 'Set First Page Header',
    //   when: () => true,
    //   callback: () => {
    //     new Dialog({
    //       title: 'First Page Header',
    //       data: [
    //         {
    //           type: 'text',
    //           label: 'Header Text',
    //           name: 'text',
    //           required: true,
    //           placeholder: 'Enter first page header text'
    //         }
    //       ],
    //       onConfirm: payload => {
    //         const text = payload.find(p => p.name === 'text')?.value
    //         if (!text) return
    //         scrivenerFirstPageHeader = [{ value: text }]
    //         scrivenerDifferentFirstPage = true
    //         const currentOptions = instance.command.getOptions()
    //         instance.command.executeUpdateOptions({
    //           ...currentOptions,
    //           differentFirstPage: scrivenerDifferentFirstPage,
    //           firstPageHeader: scrivenerFirstPageHeader
    //         } as any)
    //       }
    //     })
    //   }
    // }
  ])

  instance.register.shortcutList([
    { key: KeyMap.P, mod: true, isGlobal: true, callback: (command: Command) => command.executePrint() },
    {
      key: KeyMap.F, mod: true, isGlobal: true, callback: (command: Command) => {
        const text = command.getRangeText()
        searchDom.click()
        if (text) { searchInputDom.value = text; instance.command.executeSearch(text); setSearchResult() }
      }
    },
    { key: KeyMap.MINUS, ctrl: true, isGlobal: true, callback: (command: Command) => command.executePageScaleMinus() },
    { key: KeyMap.EQUAL, ctrl: true, isGlobal: true, callback: (command: Command) => command.executePageScaleAdd() },
    { key: KeyMap.ZERO, ctrl: true, isGlobal: true, callback: (command: Command) => command.executePageScaleRecovery() },
    {
      key: KeyMap.S,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const value = command.getValue()
        saveStatusDom.innerText = 'Saving...'
        saveStatusDom.style.color = '#f59e0b'
        localStorage.setItem('scrivener-doc', JSON.stringify(value))
        setTimeout(() => {
          saveStatusDom.innerText = '✓ Saved'
          saveStatusDom.style.color = '#22c55e'
        }, 500)
      }
    }
  ])
}
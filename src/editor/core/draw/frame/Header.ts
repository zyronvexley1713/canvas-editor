import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { EditorZone } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { pickSurroundElementList } from '../../../utils/element'
import { Position } from '../../position/Position'
import { Zone } from '../../zone/Zone'
import { Draw } from '../Draw'

export class Header {
  private draw: Draw
  private position: Position
  private zone: Zone
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  constructor(draw: Draw, data?: IElement[]) {
    this.draw = draw
    this.position = draw.getPosition()
    this.zone = draw.getZone()
    this.options = draw.getOptions()

    this.elementList = data || []
    this.rowList = []
    this.positionList = []
  }

  public getRowList(): IRow[] {
    return this.rowList
  }

  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  public getElementList(): IElement[] {
    return this.elementList
  }

  public getPositionList(): IElementPosition[] {
    return this.positionList
  }

  public compute() {
    this.recovery()
    this._computeRowList()
    this._computePositionList()
  }

  public recovery() {
    this.rowList = []
    this.positionList = []
  }

  private _computeRowList() {
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const surroundElementList = pickSurroundElementList(this.elementList)
    this.rowList = this.draw.computeRowList({
      startX: margins[3],
      startY: this.getHeaderTop(),
      innerWidth,
      elementList: this.elementList,
      surroundElementList
    })
  }

  private _computePositionList() {
    const headerTop = this.getHeaderTop()
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = headerTop
    this.position.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.HEADER
    })
  }

  public getHeaderTop(): number {
    const {
      header: { top, disabled },
      scale
    } = this.options
    if (disabled) return 0
    return Math.floor(top * scale)
  }

  public getMaxHeight(): number {
    const {
      header: { maxHeightRadio }
    } = this.options
    const height = this.draw.getHeight()
    return Math.floor(height * maxHeightRadioMapping[maxHeightRadio])
  }

  public getHeight(): number {
    if (this.options.header.disabled) return 0
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight()
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(): number {
    return this.rowList.reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(): number {
    // 页眉上边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins()
    const headerHeight = this.getHeight()
    const headerTop = this.getHeaderTop()
    const extraHeight = headerTop + headerHeight - margins[0]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  private _renderText(ctx: CanvasRenderingContext2D, text: string) {
    // const margins = this.draw.getMargins()
    const pageWidth = this.draw.getWidth()
    const headerTop = this.getHeaderTop()
    const headerHeight = this.getHeight()
    ctx.save()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#000000'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, pageWidth / 2, headerTop + headerHeight / 2)
    ctx.restore()
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    // First page different header
    const firstPageDifferent = (this.options as any).firstPageDifferent
    if (firstPageDifferent && pageNo === 0) {
      const firstPageHeaderText = (this.options as any).firstPageHeaderText
      if (firstPageHeaderText) {
        this._renderText(ctx, firstPageHeaderText)
      }
      return
    }
    ctx.save()
    ctx.globalAlpha = this.zone.isHeaderActive()
      ? 1
      : this.options.header.inactiveAlpha
    const innerWidth = this.draw.getInnerWidth()
    const maxHeight = this.getMaxHeight()
    // 超出最大高度不渲染
    const rowList: IRow[] = []
    let curRowHeight = 0
    for (let r = 0; r < this.rowList.length; r++) {
      const row = this.rowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }
    // Header background
    const headerBgColor = (this.options as any).headerBackground
    if (headerBgColor) {
      const margins = this.draw.getMargins()
      const pageWidth = this.draw.getWidth()
      const headerTop = this.getHeaderTop()
      const headerHeight = this.getHeight()
      ctx.save()
      ctx.globalAlpha = 1
      ctx.fillStyle = headerBgColor
      ctx.fillRect(0, headerTop - margins[0] * 0.5, pageWidth, headerHeight + margins[0] * 0.5)
      ctx.restore()
    }
    this.draw.drawRow(ctx, {
      elementList: this.elementList,
      positionList: this.positionList,
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.HEADER
    })
    ctx.restore()
  }
}

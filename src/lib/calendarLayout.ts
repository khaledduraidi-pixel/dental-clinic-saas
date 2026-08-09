// Positions appointments that might overlap in time (e.g. a double-booking,
// or several doctors' appointments merged into one week-view day column)
// into side-by-side sub-columns, greedy-interval-graph style: walk events in
// start order, drop each into the first sub-column whose last event has
// already ended, otherwise open a new sub-column. Every event in the pass
// shares one columnCount so a block never has to resize when a sibling
// appears — good enough for a clinic's realistically low overlap rate,
// short of a fully accurate per-cluster width algorithm.
export interface LaidOutItem<T> {
  item: T
  column: number
  columnCount: number
}

export function layoutOverlaps<T>(
  items: T[],
  getStart: (item: T) => number,
  getEnd: (item: T) => number,
): LaidOutItem<T>[] {
  const sorted = [...items].sort((a, b) => getStart(a) - getStart(b))
  const columns: T[][] = []

  for (const item of sorted) {
    const start = getStart(item)
    const target = columns.find((col) => getEnd(col[col.length - 1]) <= start)
    if (target) {
      target.push(item)
    } else {
      columns.push([item])
    }
  }

  const columnCount = Math.max(columns.length, 1)
  const result: LaidOutItem<T>[] = []
  columns.forEach((col, columnIndex) => {
    for (const item of col) {
      result.push({ item, column: columnIndex, columnCount })
    }
  })
  return result
}

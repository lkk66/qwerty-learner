export function restorePosition(
  record: { unitId: string; sentenceIndex: number; completed?: boolean },
  unitIds: string[],
  mappedTargets: string[] = [],
  allUnitIds: string[] = [],
): number {
  let position = unitIds.indexOf(record.unitId)
  if (position < 0) position = mappedTargets.map((id) => unitIds.indexOf(id)).find((value) => value >= 0) ?? -1
  if (position >= 0) return Math.min(unitIds.length, position + (record.completed === true ? 1 : 0))
  const anchor = [record.unitId, ...mappedTargets].map((id) => allUnitIds.indexOf(id)).find((value) => value >= 0) ?? -1
  if (anchor >= 0) {
    for (let i = anchor; i < allUnitIds.length; i += 1) {
      position = unitIds.indexOf(allUnitIds[i])
      if (position >= 0) return position
    }
    for (let i = anchor - 1; i >= 0; i -= 1) {
      position = unitIds.indexOf(allUnitIds[i])
      if (position >= 0) return position
    }
  }
  return Math.min(Math.max(record.sentenceIndex, 0), Math.max(0, unitIds.length - 1))
}

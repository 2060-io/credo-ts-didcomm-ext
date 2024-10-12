import { tsemrtd } from '../esm'

import { EMrtdDataGroup } from './EMrtdDataGroup'

export type EMrtdData = {
  raw: Record<string, string>
  parsed: { fields: ParsedEMrtdData; valid: boolean }
}

export type ParsedEMrtdData = Partial<Record<EMrtdDataGroup, string | null>>

export function EMrtdParse(input: Record<string, string>): ParsedEMrtdData {
  const parsedData: ParsedEMrtdData = {}

  for (const [key, value] of Object.entries(input)) {
    switch (key as EMrtdDataGroup) {
      case EMrtdDataGroup.COM:
        parsedData[EMrtdDataGroup.COM] = JSON.stringify(tsemrtd.COM.load(value))
        break
      case EMrtdDataGroup.DG1:
        parsedData[EMrtdDataGroup.DG1] = JSON.stringify(tsemrtd.DG1.load(value))
        break
      case EMrtdDataGroup.DG2:
        parsedData[EMrtdDataGroup.DG2] = JSON.stringify(tsemrtd.DG2.load(value))
        break
      case EMrtdDataGroup.DG3:
        parsedData[EMrtdDataGroup.DG3] = JSON.stringify(tsemrtd.DG3.load(value))
        break
      case EMrtdDataGroup.DG4:
        parsedData[EMrtdDataGroup.DG4] = JSON.stringify(tsemrtd.DG4.load(value))
        break
      case EMrtdDataGroup.DG5:
        parsedData[EMrtdDataGroup.DG5] = JSON.stringify(tsemrtd.DG5.load(value))
        break
      case EMrtdDataGroup.DG7:
        parsedData[EMrtdDataGroup.DG7] = JSON.stringify(tsemrtd.DG7.load(value))
        break
      case EMrtdDataGroup.DG11:
        parsedData[EMrtdDataGroup.DG11] = JSON.stringify(tsemrtd.DG11.load(value))
        break
      case EMrtdDataGroup.DG12:
        parsedData[EMrtdDataGroup.DG12] = JSON.stringify(tsemrtd.DG12.load(value))
        break
      case EMrtdDataGroup.DG14:
        parsedData[EMrtdDataGroup.DG14] = JSON.stringify(tsemrtd.DG14.load(value))
        break
      case EMrtdDataGroup.DG15:
        parsedData[EMrtdDataGroup.DG15] = JSON.stringify(tsemrtd.DG15.load(value))
        break
      case EMrtdDataGroup.SOD:
        parsedData[EMrtdDataGroup.SOD] = JSON.stringify(tsemrtd.SOD.load(value))
        break
      case EMrtdDataGroup.PKD:
        parsedData[EMrtdDataGroup.PKD] = JSON.stringify(tsemrtd.PKD.load(value))
        break
      default:
        break
    }
  }

  return parsedData
}

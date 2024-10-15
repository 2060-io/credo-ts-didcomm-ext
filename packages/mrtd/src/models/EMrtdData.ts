import { COM, DG1, DG2, DG3, DG4, DG5, DG7, DG11, DG12, DG14, DG15, SOD, PKD } from '../esm'

import { EMrtdDataGroup } from './EMrtdDataGroup'

export type EMrtdData = {
  raw: Record<string, string>
  parsed: { fields: ParsedEMrtdData; valid: boolean }
}

export type ParsedEMrtdData = Partial<Record<EMrtdDataGroup, string | null>>

export function EMrtdParse(input: Record<string, string>): ParsedEMrtdData {
  const parsedData: ParsedEMrtdData = {}

  for (const [key, value] of Object.entries(input)) {
    const decodedValue = Buffer.from(value, 'base64')
    switch (key as EMrtdDataGroup) {
      case EMrtdDataGroup.COM:
        parsedData[EMrtdDataGroup.COM] = JSON.stringify(COM.load(decodedValue))
        break
      case EMrtdDataGroup.DG1:
        parsedData[EMrtdDataGroup.DG1] = JSON.stringify(DG1.load(decodedValue))
        break
      case EMrtdDataGroup.DG2:
        parsedData[EMrtdDataGroup.DG2] = JSON.stringify(DG2.load(decodedValue))
        break
      case EMrtdDataGroup.DG3:
        parsedData[EMrtdDataGroup.DG3] = JSON.stringify(DG3.load(decodedValue))
        break
      case EMrtdDataGroup.DG4:
        parsedData[EMrtdDataGroup.DG4] = JSON.stringify(DG4.load(decodedValue))
        break
      case EMrtdDataGroup.DG5:
        parsedData[EMrtdDataGroup.DG5] = JSON.stringify(DG5.load(decodedValue))
        break
      case EMrtdDataGroup.DG7:
        parsedData[EMrtdDataGroup.DG7] = JSON.stringify(DG7.load(decodedValue))
        break
      case EMrtdDataGroup.DG11:
        parsedData[EMrtdDataGroup.DG11] = JSON.stringify(DG11.load(decodedValue))
        break
      case EMrtdDataGroup.DG12:
        parsedData[EMrtdDataGroup.DG12] = JSON.stringify(DG12.load(decodedValue))
        break
      case EMrtdDataGroup.DG14:
        parsedData[EMrtdDataGroup.DG14] = JSON.stringify(DG14.load(decodedValue))
        break
      case EMrtdDataGroup.DG15:
        parsedData[EMrtdDataGroup.DG15] = JSON.stringify(DG15.load(decodedValue))
        break
      case EMrtdDataGroup.SOD:
        parsedData[EMrtdDataGroup.SOD] = JSON.stringify(SOD.load(decodedValue))
        break
      case EMrtdDataGroup.PKD:
        parsedData[EMrtdDataGroup.PKD] = JSON.stringify(PKD.load(decodedValue))
        break
      default:
        break
    }
  }

  return parsedData
}

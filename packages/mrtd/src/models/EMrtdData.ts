import type { SecurityInfos } from '@li0ard/tsemrtd/dist/asn1/eac'
import type { CSCAMasterList } from '@li0ard/tsemrtd/dist/asn1/pkd'
import type {
  DecodedAdditionalDocumentData,
  DecodedAdditionalPersonalData,
  DecodedCom,
  DecodedFingerprint,
  DecodedImage,
  DecodedIris,
  DecodedSecurtyObjectOfDocument,
} from '@li0ard/tsemrtd/dist/consts/interfaces'
import type { SubjectPublicKeyInfo } from '@peculiar/asn1-x509'

import { COM, DG1, DG2, DG3, DG4, DG5, DG7, DG11, DG12, DG14, DG15, SOD, PKD } from '../esm'

import { EMrtdDataGroup } from './EMrtdDataGroup'

export type EMrtdData = {
  raw: Record<string, string>
  parsed: { fields?: ParsedEMrtdData; valid: boolean }
}

export type ParsedEMrtdData = {
  com: DecodedCom
  mrzData: string
  images: DecodedImage[]
  fingerprints?: DecodedFingerprint[]
  iris?: DecodedIris[]
  displayedImages?: Buffer[]
  signatureImages?: Buffer[]
  additionalPersonalData?: DecodedAdditionalPersonalData
  additionalDocumentData?: DecodedAdditionalDocumentData
  securityInfos?: SecurityInfos
  subjectPublicKeyInfo?: SubjectPublicKeyInfo
  securityObjectOfDocument: DecodedSecurtyObjectOfDocument
  cscaMasterList?: CSCAMasterList
}

/**
 *
 * @param input object containing base64-encoded eMRTD data groups
 * @returns parsed eMRDT Data
 * @throws Error in case of missing mandatory data (EF_COM, EF_DG1, EF_DG2 or EF_SOD)
 */
export function parseEMrtdData(input: Record<EMrtdDataGroup, string>): ParsedEMrtdData {
  const parsedData: Partial<ParsedEMrtdData> = {}

  for (const [key, value] of Object.entries(input)) {
    const decodedValue = Buffer.from(value, 'base64')
    switch (key as EMrtdDataGroup) {
      case EMrtdDataGroup.COM:
        parsedData.com = COM.load(decodedValue)
        break
      case EMrtdDataGroup.DG1:
        parsedData.mrzData = DG1.load(decodedValue)
        break
      case EMrtdDataGroup.DG2:
        parsedData.images = DG2.load(decodedValue)
        break
      case EMrtdDataGroup.DG3:
        parsedData.fingerprints = DG3.load(decodedValue)
        break
      case EMrtdDataGroup.DG4:
        parsedData.iris = DG4.load(decodedValue)
        break
      case EMrtdDataGroup.DG5:
        parsedData.displayedImages = DG5.load(decodedValue)
        break
      case EMrtdDataGroup.DG7:
        parsedData.signatureImages = DG7.load(decodedValue)
        break
      case EMrtdDataGroup.DG11:
        parsedData.additionalPersonalData = DG11.load(decodedValue)
        break
      case EMrtdDataGroup.DG12:
        parsedData.additionalDocumentData = DG12.load(decodedValue)
        break
      case EMrtdDataGroup.DG14:
        parsedData.securityInfos = DG14.load(decodedValue)
        break
      case EMrtdDataGroup.DG15:
        parsedData.subjectPublicKeyInfo = DG15.load(decodedValue)
        break
      case EMrtdDataGroup.SOD:
        parsedData.securityObjectOfDocument = SOD.load(decodedValue)
        break
      case EMrtdDataGroup.PKD:
        parsedData.cscaMasterList = PKD.load(decodedValue)
        break
      default:
        break
    }
  }

  if (!parsedData.com || !parsedData.mrzData || !parsedData.images || !parsedData.securityObjectOfDocument) {
    throw Error('Parsed data misses mandatory files')
  }

  return parsedData as ParsedEMrtdData
}

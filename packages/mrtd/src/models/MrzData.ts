import type * as Mrz from 'mrz'

export type MrzData = {
  raw: string | string[]
  parsed: { format?: Mrz.MRZFormat; fields: Partial<Record<Mrz.FieldName, string | null>>; valid: boolean }
}

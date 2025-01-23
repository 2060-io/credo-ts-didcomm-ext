import type * as Mrz from 'mrz'

export type MrzData = {
  raw: string | string[]
  parsed: { format?: Mrz.MRZFormat; fields: Partial<Record<Mrz.FieldName, string | null>>; valid: boolean }
}

export function validateMrzChecksum(line: string): boolean {
  const charValues: { [key: string]: number } = {
    A: 10,
    B: 11,
    C: 12,
    D: 13,
    E: 14,
    F: 15,
    G: 16,
    H: 17,
    I: 18,
    J: 19,
    K: 20,
    L: 21,
    M: 22,
    N: 23,
    O: 24,
    P: 25,
    Q: 26,
    R: 27,
    S: 28,
    T: 29,
    U: 30,
    V: 31,
    W: 32,
    X: 33,
    Y: 34,
    Z: 35,
  }

  const weights = [7, 3, 1]
  const checkDigit = parseInt(line.slice(-1))
  const lineToValidate = line.slice(0, -1)

  const total = lineToValidate.split('').reduce((acc, char, index) => {
    let value: number
    if (/\d/.test(char)) {
      value = parseInt(char)
    } else if (/[A-Z]/.test(char)) {
      value = charValues[char]
    } else if (char === '<') {
      value = 0
    } else {
      return acc
    }

    return acc + value * weights[index % 3]
  }, 0)

  return total % 10 === checkDigit
}

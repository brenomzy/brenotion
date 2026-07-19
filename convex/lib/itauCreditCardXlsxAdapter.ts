"use node";

import { Buffer } from 'node:buffer';

import readExcelFile from 'read-excel-file/node';

import {
  ItauCreditCardXlsxParseError,
  type ParsedItauCreditCardStatement,
  parseItauCreditCardStatementRows,
} from './itauCreditCardStatement';

export async function readItauCreditCardStatementFromXlsx(
  bytes: ArrayBuffer,
): Promise<ParsedItauCreditCardStatement> {
  const sheets = await readExcelFile(Buffer.from(bytes));
  const candidateSheets = sheets.filter((sheet) =>
    /^Fatura\s+\d{2}-\d{2}$/i.test(sheet.sheet.trim()),
  );

  if (candidateSheets.length !== 1) {
    throw new ItauCreditCardXlsxParseError('XLSX_INVALID_FORMAT');
  }

  return parseItauCreditCardStatementRows(candidateSheets[0].data);
}

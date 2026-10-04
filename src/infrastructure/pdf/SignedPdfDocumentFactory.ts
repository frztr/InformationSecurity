import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";

/**
 * Содержимое подписанного PDF-экспорта сообщения.
 */
export type SignedPdfContent = {
  messageId: string;
  userLogin: string;
  methodLabel: string;
  createdAtIso: string;
  plaintext: string;
  ciphertextHex: string;
  keyDump: Array<{ label: string; value: string }>;
  signatureKeyDump: Array<{ label: string; value: string }>;
  streebog512Hex: string;
  signatureHex: string;
  rsaModulusBitLength: number;
  signatureValid: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 40;
const TOP_MARGIN = 800;
const BOTTOM_MARGIN = 50;
const FONT_SIZE = 8;

/**
 * Собирает PDF с исходником, шифртекстом, ключами и ЭЦП (Стрибог-512 + RSA).
 * Helvetica/Courier в pdf-lib без кириллицы и без переносов `\n` — из‑за этого
 * ключи PEM наслаивались, а русский текст превращался в «?».
 */
export class SignedPdfDocumentFactory {
  /**
   * Строит PDF (несколько страниц при необходимости) и возвращает байты.
   * @param content Поля экспорта.
   * @returns Байты PDF.
   */
  public async create(content: SignedPdfContent): Promise<Uint8Array> {
    const pdfDocument = await PDFDocument.create();
    pdfDocument.registerFontkit(fontkit);
    const font = await pdfDocument.embedFont(loadMonoFontBytes(), { subset: true });
    const glyphSet = new Set(font.getCharacterSet());
    const lineHeight = Math.ceil(font.heightAtSize(FONT_SIZE)) + 3;
    const maxChars = maxCharsPerLine(font, FONT_SIZE);

    let page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursorY = TOP_MARGIN;

    const writeLine = (line: string): void => {
      if (cursorY < BOTTOM_MARGIN) {
        page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursorY = TOP_MARGIN;
      }
      page.drawText(sanitizeForFont(line.replace(/\t/g, "  "), glyphSet), {
        x: LEFT_MARGIN,
        y: cursorY,
        size: FONT_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.12),
      });
      cursorY -= lineHeight;
    };

    const writeBlock = (value: string, width: number = maxChars): void => {
      wrapText(value, width).forEach(writeLine);
    };

    writeLine("Подписанный экспорт сообщения");
    writeLine(`Идентификатор: ${content.messageId}`);
    writeLine(`Пользователь: ${content.userLogin}`);
    writeLine(`Метод: ${content.methodLabel}`);
    writeLine(`Создано: ${content.createdAtIso}`);
    writeLine(`RSA, бит модуля: ${content.rsaModulusBitLength}`);
    writeLine(`ЭЦП: ${content.signatureValid ? "действительна" : "недействительна"}`);
    writeLine("");
    writeLine("--- Исходный текст ---");
    writeBlock(content.plaintext);
    writeLine("");
    writeLine("--- Шифртекст (hex) ---");
    writeBlock(content.ciphertextHex, 96);
    writeLine("");
    writeLine("--- Ключи шифрования ---");
    for (const field of content.keyDump) {
      writeLine(field.label);
      writeBlock(field.value, 64);
      writeLine("");
    }
    writeLine("--- Ключи подписи ---");
    for (const field of content.signatureKeyDump) {
      writeLine(field.label);
      writeBlock(field.value, 64);
      writeLine("");
    }
    writeLine("--- Стрибог-512 ---");
    writeBlock(content.streebog512Hex, 64);
    writeLine("");
    writeLine("--- ЭЦП RSA-Стрибог (hex) ---");
    writeBlock(content.signatureHex, 96);

    return pdfDocument.save();
  }
}

function wrapText(value: string, width: number): string[] {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    for (let index = 0; index < paragraph.length; index += width) {
      lines.push(paragraph.slice(index, index + width));
    }
  }
  return lines.length > 0 ? lines : [""];
}

function sanitizeForFont(line: string, glyphSet: Set<number>): string {
  if (line.length === 0) {
    return " ";
  }
  return [...line]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && glyphSet.has(codePoint) ? character : "?";
    })
    .join("");
}

function maxCharsPerLine(font: PDFFont, fontSize: number): number {
  const usableWidth = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
  const sample = font.widthOfTextAtSize("0", fontSize);
  if (sample <= 0) {
    return 96;
  }
  return Math.max(32, Math.floor(usableWidth / sample));
}

function loadMonoFontBytes(): Uint8Array {
  const fontDirectory = join(process.cwd(), "src/infrastructure/pdf/fonts");
  const fontPath = join(fontDirectory, "DejaVuSansMono.ttf");
  return new Uint8Array(readFileSync(fontPath));
}

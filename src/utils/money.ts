import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/** quantity * priceNet, gerundet auf 2 Dezimalstellen */
export function calcNet(quantity: number, priceNet: number): number {
  return new Decimal(quantity).mul(priceNet).toDecimalPlaces(2).toNumber();
}

/** net * taxRate / 100, gerundet auf 2 Dezimalstellen */
export function calcTax(net: number, taxRate: number): number {
  return new Decimal(net).mul(taxRate).div(100).toDecimalPlaces(2).toNumber();
}

/** net + tax, gerundet auf 2 Dezimalstellen */
export function calcGross(net: number, tax: number): number {
  return new Decimal(net).plus(tax).toDecimalPlaces(2).toNumber();
}

/** gross / (1 + taxRate/100), gerundet auf 2 Dezimalstellen */
export function calcNetFromGross(gross: number, taxRate: number): number {
  return new Decimal(gross)
    .div(new Decimal(1).plus(new Decimal(taxRate).div(100)))
    .toDecimalPlaces(2)
    .toNumber();
}

/** Präzise Summe eines number-Arrays */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => new Decimal(acc).plus(v).toNumber(), 0);
}

/** Rundet einen Wert auf 2 Dezimalstellen */
export function round2(value: number): number {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}

/** Akkumuliert einen Wert in eine Record-Map (für Steuer-Aufschlüsselung) */
export function addToMap(map: Record<number, number>, key: number, value: number): void {
  map[key] = new Decimal(map[key] ?? 0).plus(value).toNumber();
}

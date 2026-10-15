import { Prisma } from "@prisma/client";

export function toDecimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function formatBalance(value: string | number | Prisma.Decimal): string {
  return new Prisma.Decimal(value).toFixed(4);
}

export function decimalJson(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toFixed(4);
}

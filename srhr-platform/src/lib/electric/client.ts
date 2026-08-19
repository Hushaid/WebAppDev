import { ShapeStream, type Row } from "@electric-sql/client"

const ELECTRIC_URL = process.env.NEXT_PUBLIC_ELECTRIC_URL ?? "http://localhost:3000/api/electric"

export function createShapeStream<T extends Row>(
  table: string,
  where?: string,
) {
  return new ShapeStream<T>({
    url: ELECTRIC_URL,
    params: {
      table,
      ...(where ? { where } : {}),
    },
  })
}

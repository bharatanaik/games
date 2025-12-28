export function generateBingoBoard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5)

  return numbers.map((num) => ({
    number: num,
    marked: false,
  }))
}

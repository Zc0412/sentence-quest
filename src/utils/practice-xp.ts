export function practiceXp(firstPass: boolean, perfect: boolean): number {
  return firstPass ? 10 + (perfect ? 5 : 0) : 0;
}

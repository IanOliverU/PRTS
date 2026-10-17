/** Hold preparation before success, including when a background tab resumes. */
export function advanceIntro(time: number, elapsed: number, ready: boolean): number {
  return Math.min(ready ? 14 : 9.8, time + elapsed);
}

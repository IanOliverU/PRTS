import {describe, expect, it} from "vitest";
import {advanceIntro} from "./clock";
describe("startup readiness clock", () => {
 it("holds before the welcome while access is unresolved", () => {
  expect(advanceIntro(9.7, 30, false)).toBe(9.8);
  expect(advanceIntro(9.8, 30, false)).toBe(9.8);
 });
 it("resumes the welcome sequence only after readiness", () => {
  expect(advanceIntro(9.8, 2, true)).toBe(11.8);
  expect(advanceIntro(13.9, 30, true)).toBe(14);
 });
});

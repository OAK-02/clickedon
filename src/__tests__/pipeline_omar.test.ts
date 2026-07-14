/**
 *                          **My BONUS test**
 * 
 * TEST 1
 * The curent system assumes an output will be recieved from mockStream.
 * Hence, we dont test the edge case when anthropic server might 
 * not respond and keep throwing server errors (500 - 599)    
 * This might leave the user hanging in buffer at the front-end
 */

import { describe, it, expect } from "vitest";
import { generate } from "../lib/pipeline";

describe("Bug 1 — ecounter server error", () => {
  it("returns status 'error' when mockStream gives a server error code", async () => {
    const res = await generate({
      behavior: "server-error",
      advanceToNextStage: async () => {
      },
      reviewPasses: () => true,
    });
    expect(res.status).toBe("error");
  });
});
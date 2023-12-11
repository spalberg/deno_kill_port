import { assert, assertEquals, assertFalse } from "./test_deps.ts";
import { killPort } from "./mod.ts";

Deno.test("it should kill the port process", async () => {
  // Setup
  const port = 9999;
  const process = new Deno.Command(Deno.execPath(), {
    args: [
      "eval",
      `Deno.serve({ port: ${port} }, () => new Response('Hello World'))`,
    ],
  }).spawn();
  await new Promise((resolve) => setTimeout(resolve, 1000)); // give it a second to start
  assertFalse(isAddrFree(port), `Port ${port} should be in use!`);

  // Act
  const killedPid = await killPort(9999);

  // Validate
  assertEquals(killedPid, process.pid, "Should have killed the process!");
  assert(isAddrFree(port), `Port ${port} should be free!`);
});

function isAddrFree(port: number): boolean {
  let listener: Deno.Listener | null = null;
  try {
    listener = Deno.listen({ port });
  } catch (err) {
    if (err instanceof Deno.errors.AddrInUse) {
      return false;
    }
    throw err;
  } finally {
    listener?.close();
  }
  return true;
}

interface KillPortOptions {
  protocol: "tcp" | "udp";
}

/**
 *  Finds and kills the informed port process / task
 * @param port Port number
 * @param options (optional)
 * @return Returns a promise with the port's PID or null if the port PID was not found
 *
 * Example:
 *
 *     await killPort(8082);
 */
export async function killPort(
  port: number,
  options: KillPortOptions = {
    protocol: "tcp",
  },
): Promise<number | null> {
  return await (Deno.build.os == "windows"
    ? handleKillPortWindows(port, options)
    : handleKillPort(port, options));
}

async function handleKillPortWindows(
  port: number,
  options: KillPortOptions,
): Promise<number | null> {
  const pid = await getPidPortWindows(port, options);

  if (!pid) {
    return null;
  }

  await killProcessWindows(pid);

  return pid;
}

async function getPidPortWindows(
  port: number,
  options: KillPortOptions,
): Promise<number | null> {
  const cmd = new Deno.Command("cmd", {
    args: ["/c", "netstat -a -n -o | findstr", `${port}`],
  });
  const { stdout } = await cmd.output();

  const output = new TextDecoder("utf-8").decode(stdout);

  const lines = output.split("\n");
  const lineWithLocalPortRegEx = new RegExp(
    `^ *${options.protocol.toUpperCase()} *[^ ]*:${port}`,
    "gm",
  );
  const linesWithLocalPort = lines.filter((line) =>
    line.match(lineWithLocalPortRegEx)
  );

  if (linesWithLocalPort.length === 0) return null;

  const pid = linesWithLocalPort[0].trim().split(/[\s, ]+/)[4];
  return pid ? parseInt(pid) : null;
}

async function killProcessWindows(pid: number): Promise<void> {
  const cmd = new Deno.Command("cmd", {
    args: ["cmd", "/c", `taskkill /PID ${pid} /F`],
  });
  await cmd.output();
}

async function handleKillPort(
  port: number,
  options: KillPortOptions,
): Promise<number | null> {
  const pid = await getPidPort(port, options);
  if (!pid) {
    return null;
  }
  await killProcess(pid);
  return pid;
}

async function getPidPort(
  port: number,
  options: KillPortOptions,
): Promise<number> {
  const cmd = new Deno.Command("fuser", {
    args: [`${port}/${options.protocol}`],
  });
  const { stdout } = await cmd.output();
  return parseInt(new TextDecoder().decode(stdout).trim());
}

async function killProcess(pid: number): Promise<void> {
  const cmd = new Deno.Command("kill", { args: ["-9", `${pid}`] });
  await cmd.output();
  await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms since the process is not killed immediately
}

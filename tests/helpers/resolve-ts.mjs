/* Tylko dla testów (`node --import`): pozwala załadować moduły TypeScript
   aplikacji tak, jak robi to Next — importy względne bez rozszerzenia,
   alias „@/” na katalog projektu i „next/server” na next/server.js. */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    let target = specifier;
    if (target.startsWith("@/")) target = new URL(target.slice(2), root).href;
    const relative = /^\.{1,2}\//.test(target);
    if ((relative || target.startsWith("file:")) && !/\.[cm]?[jt]sx?$/.test(target)) {
      const candidate = new URL(`${target}.ts`, relative ? context.parentURL : undefined);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(target, context);
  },
});

// Lets the node --experimental-strip-types test scripts import "@/..." (src/...) the way the app does.
import { register } from "node:module";

register("./ts-alias-hooks.mjs", import.meta.url);

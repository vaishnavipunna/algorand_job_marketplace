import { Buffer } from "buffer";
import process from "process";

if (typeof global === "undefined") {
  window.global = window;
}

window.Buffer = Buffer;
window.process = process;

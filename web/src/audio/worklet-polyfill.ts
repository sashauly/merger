// src/audio/worklet-polyfill.ts

if (typeof (globalThis as any).TextDecoder === "undefined") {
  (globalThis as any).TextDecoder = class TextDecoder {
    decode(arr: Uint8Array): string {
      if (!arr || arr.length === 0) return "";
      try {
        return decodeURIComponent(
          Array.from(arr)
            .map((b) => "%" + b.toString(16).padStart(2, "0"))
            .join(""),
        );
      } catch (e) {
        let str = "";
        for (let i = 0; i < arr.length; i++) {
          str += String.fromCharCode(arr[i]);
        }
        return str;
      }
    }
  };
}

if (typeof (globalThis as any).TextEncoder === "undefined") {
  (globalThis as any).TextEncoder = class TextEncoder {
    encode(str: string): Uint8Array {
      const utf8 = unescape(encodeURIComponent(str));
      const res = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) {
        res[i] = utf8.charCodeAt(i);
      }
      return res;
    }
  };
}

// Polyfill global URL class for background Worklet environments
if (typeof (globalThis as any).URL === "undefined") {
  (globalThis as any).URL = class URL {
    public href: string;
    public pathname: string;

    constructor(url: string | URL, _base?: string | URL) {
      const urlStr = url.toString();
      this.href = urlStr;

      // Simple parse to avoid crashes if pathname is evaluated
      const parts = urlStr.split("/");
      this.pathname = parts[parts.length - 1] || "";
    }

    toString() {
      return this.href;
    }
  };
}

// Polyfill global fetch to throw a descriptive error instead of a generic ReferenceError
if (typeof (globalThis as any).fetch === "undefined") {
  (globalThis as any).fetch = async () => {
    throw new Error(
      "fetch() is not supported inside the AudioWorklet thread. " +
        "Make sure you are passing the compiled WASM ArrayBuffer directly to init().",
    );
  };
}

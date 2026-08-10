const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(`[${timestamp()}] INFO: ${message}`, meta ?? "");
  },
  error: (message: string, meta?: object) => {
    console.error(`[${timestamp()}] ERROR: ${message}`, meta ?? "");
  },
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${timestamp()}] DEBUG: ${message}`, meta ?? "");
    }
  },
};

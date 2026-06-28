import { PactV3 } from "@pact-foundation/pact";
import path from "path";

// Export a single, configured provider instance
export const provider = new PactV3({
    consumer: "BookistFrontend",
    provider: "BookistBackend",
    dir: path.resolve(process.cwd(), "pacts"),
    logLevel: 'error',
});
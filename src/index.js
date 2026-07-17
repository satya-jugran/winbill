"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Winbill = exports.InvoiceGenerator = exports.container = exports.TYPES = void 0;
require("reflect-metadata");
const inversify_config_1 = require("./config/inversify.config");
Object.defineProperty(exports, "container", { enumerable: true, get: function () { return inversify_config_1.container; } });
const types_1 = require("./config/types");
Object.defineProperty(exports, "TYPES", { enumerable: true, get: function () { return types_1.TYPES; } });
const InvoiceGenerator_1 = require("./core/InvoiceGenerator");
Object.defineProperty(exports, "InvoiceGenerator", { enumerable: true, get: function () { return InvoiceGenerator_1.InvoiceGenerator; } });
/**
 * The main facade for the Winbill package.
 * Consumers instantiate this class to generate PDFs.
 */
class Winbill {
    generator;
    constructor() {
        // Resolve the internal InvoiceGenerator from the DI container
        this.generator = inversify_config_1.container.get(types_1.TYPES.InvoiceGenerator);
    }
    async generateInvoice(data, options) {
        return this.generator.generate(data, options);
    }
    /**
     * Helper method to generate a random alphanumeric invoice number.
     * @param prefix Optional string to prepend to the generated number (e.g. "INV-")
     * @returns A generated random invoice number.
     */
    generateInvoiceNumber(prefix) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestampPart = Date.now().toString().slice(-4);
        const generatedNumber = `${timestampPart}-${randomPart}`;
        return prefix ? `${prefix}${generatedNumber}` : generatedNumber;
    }
}
exports.Winbill = Winbill;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceGenerator = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../config/types");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
let InvoiceGenerator = class InvoiceGenerator {
    layoutStrategy;
    constructor(layoutStrategy) {
        this.layoutStrategy = layoutStrategy;
    }
    async generate(data, options) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({ margin: 50 });
                const writeStream = fs.createWriteStream(options.filePath);
                doc.pipe(writeStream);
                // Delegate drawing logic to the layout strategy
                const strategyToUse = (options.layout && options.layout !== 'default')
                    ? options.layout
                    : this.layoutStrategy;
                strategyToUse.draw(doc, data);
                doc.end();
                writeStream.on("finish", () => {
                    resolve();
                });
                writeStream.on("error", (error) => {
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
};
exports.InvoiceGenerator = InvoiceGenerator;
exports.InvoiceGenerator = InvoiceGenerator = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.LayoutStrategy)),
    __metadata("design:paramtypes", [Object])
], InvoiceGenerator);

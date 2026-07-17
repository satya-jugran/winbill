import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { DefaultGrayscaleLayout } from "../layouts/DefaultGrayscaleLayout";
import { InvoiceGenerator } from "../core/InvoiceGenerator";

const container = new Container();

container.bind<ILayoutStrategy>(TYPES.LayoutStrategy).to(DefaultGrayscaleLayout);
container.bind<InvoiceGenerator>(TYPES.InvoiceGenerator).to(InvoiceGenerator);

export { container };

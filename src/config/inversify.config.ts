import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";
import { DefaultLayout } from "../layouts/DefaultLayout";
import { DefaultLayoutTransformer } from "../transformers/DefaultLayoutTransformer";
import { LayoutFactory } from "../factories/LayoutFactory";
import { BillProcessor } from "../core/BillProcessor";
import { Renderer } from "../core/Renderer";
import { BillGenerator } from "../core/BillGenerator";

const container = new Container();

container.bind<ILayoutStrategy>(TYPES.LayoutStrategy).to(DefaultLayout);
container.bind<DefaultLayout>(TYPES.DefaultLayout).to(DefaultLayout);
container.bind<IRenderTransformer<any>>(TYPES.DefaultTransformer).to(DefaultLayoutTransformer);
container.bind<DefaultLayoutTransformer>(TYPES.DefaultLayoutTransformer).to(DefaultLayoutTransformer);
container.bind<LayoutFactory>(TYPES.LayoutFactory).to(LayoutFactory);
container.bind<BillProcessor>(TYPES.BillProcessor).to(BillProcessor);
container.bind<Renderer>(TYPES.Renderer).to(Renderer);
container.bind<BillGenerator>(TYPES.BillGenerator).to(BillGenerator);

export { container };

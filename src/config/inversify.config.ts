import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";

import { DefaultLayout } from "../layouts/DefaultLayout";
import { DefaultLayoutTransformer } from "../transformers/DefaultLayoutTransformer";
import { MinimalLayout } from "../layouts/MinimalLayout";
import { MinimalLayoutTransformer } from "../transformers/MinimalLayoutTransformer";
import { ThermalLayout } from "../layouts/ThermalLayout";
import { ThermalLayoutTransformer } from "../transformers/ThermalLayoutTransformer";
import { ModernLayout } from "../layouts/ModernLayout";
import { ModernLayoutTransformer } from "../transformers/ModernLayoutTransformer";

import { LayoutFactory } from "../factories/LayoutFactory";
import { BillProcessor } from "../core/BillProcessor";
import { Renderer } from "../core/Renderer";
import { BillGenerator } from "../core/BillGenerator";

const container = new Container();

container.bind<ILayoutStrategy>(TYPES.LayoutStrategy).to(DefaultLayout);
container.bind<DefaultLayout>(TYPES.DefaultLayout).to(DefaultLayout);
container.bind<IRenderTransformer<any>>(TYPES.DefaultTransformer).to(DefaultLayoutTransformer);
container.bind<DefaultLayoutTransformer>(TYPES.DefaultLayoutTransformer).to(DefaultLayoutTransformer);

container.bind<MinimalLayout>(TYPES.MinimalLayout).to(MinimalLayout);
container.bind<MinimalLayoutTransformer>(TYPES.MinimalLayoutTransformer).to(MinimalLayoutTransformer);

container.bind<ThermalLayout>(TYPES.ThermalLayout).to(ThermalLayout);
container.bind<ThermalLayoutTransformer>(TYPES.ThermalLayoutTransformer).to(ThermalLayoutTransformer);

container.bind<ModernLayout>(TYPES.ModernLayout).to(ModernLayout);
container.bind<ModernLayoutTransformer>(TYPES.ModernLayoutTransformer).to(ModernLayoutTransformer);

container.bind<LayoutFactory>(TYPES.LayoutFactory).to(LayoutFactory);
container.bind<BillProcessor>(TYPES.BillProcessor).to(BillProcessor);
container.bind<Renderer>(TYPES.Renderer).to(Renderer);
container.bind<BillGenerator>(TYPES.BillGenerator).to(BillGenerator);

export { container };

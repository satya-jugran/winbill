import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { LayoutType } from "../models/types";
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

@injectable()
export class LayoutFactory {
  constructor(
    @inject(TYPES.DefaultLayout) private defaultLayout: DefaultLayout,
    @inject(TYPES.DefaultLayoutTransformer) private defaultTransformer: DefaultLayoutTransformer,
    
    @inject(TYPES.MinimalLayout) private minimalLayout: MinimalLayout,
    @inject(TYPES.MinimalLayoutTransformer) private minimalTransformer: MinimalLayoutTransformer,
    
    @inject(TYPES.ThermalLayout) private thermalLayout: ThermalLayout,
    @inject(TYPES.ThermalLayoutTransformer) private thermalTransformer: ThermalLayoutTransformer,
    
    @inject(TYPES.ModernLayout) private modernLayout: ModernLayout,
    @inject(TYPES.ModernLayoutTransformer) private modernTransformer: ModernLayoutTransformer
  ) {}

  public getLayout(type: LayoutType = 'DEFAULT'): [IRenderTransformer<any> | undefined, ILayoutStrategy<any>] {
    switch (type) {
      case 'MINIMAL':
        return [this.minimalTransformer, this.minimalLayout];
      case 'THERMAL':
        return [this.thermalTransformer, this.thermalLayout];
      case 'MODERN':
        return [this.modernTransformer, this.modernLayout];
      case 'DEFAULT':
      default:
        return [this.defaultTransformer, this.defaultLayout];
    }
  }
}

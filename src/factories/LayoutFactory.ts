import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { LayoutType } from "../models/types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";
import { DefaultLayout } from "../layouts/default/DefaultLayout";
import { DefaultLayoutTransformer } from "../layouts/default/DefaultLayoutTransformer";
import { MinimalLayout } from "../layouts/minimal/MinimalLayout";
import { MinimalLayoutTransformer } from "../layouts/minimal/MinimalLayoutTransformer";
import { ThermalLayout } from "../layouts/thermal/ThermalLayout";
import { ThermalLayoutTransformer } from "../layouts/thermal/ThermalLayoutTransformer";

import { ModernLayout } from "../layouts/modern/ModernLayout";
import { ModernLayoutTransformer } from "../layouts/modern/ModernLayoutTransformer";

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

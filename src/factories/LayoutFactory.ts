import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { LayoutType } from "../models/types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";
import { DefaultLayout } from "../layouts/DefaultLayout";
import { DefaultLayoutTransformer } from "../transformers/DefaultLayoutTransformer";

@injectable()
export class LayoutFactory {
  constructor(
    @inject(TYPES.DefaultLayout) private defaultLayout: DefaultLayout,
    @inject(TYPES.DefaultLayoutTransformer) private defaultTransformer: DefaultLayoutTransformer
  ) {}

  public getLayout(type: LayoutType = 'DEFAULT'): [IRenderTransformer<any> | undefined, ILayoutStrategy<any>] {
    switch (type) {
      case 'DEFAULT':
      default:
        return [this.defaultTransformer, this.defaultLayout];
    }
  }
}

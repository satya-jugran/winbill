import { ProcessedBillData, GeneratorOptions } from "../models/types";

export interface IRenderTransformer<TLayoutData> {
  transform(data: ProcessedBillData, options?: GeneratorOptions): TLayoutData;
}

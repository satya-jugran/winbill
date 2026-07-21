import { injectable } from "inversify";
import { IRenderTransformer } from "../../interfaces/IRenderTransformer";
import { ProcessedBillData, GeneratorOptions } from "../../models/types";
import { DefaultLayoutData, DefaultLayoutTransformer } from "../default/DefaultLayoutTransformer";

// For Minimal layout, the data requirements are largely the same as Default
// so we can reuse the DefaultLayoutTransformer logic.
@injectable()
export class MinimalLayoutTransformer extends DefaultLayoutTransformer {}

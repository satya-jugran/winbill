import { injectable } from "inversify";
import { DefaultLayoutTransformer } from "./DefaultLayoutTransformer";

// The data requirements for Thermal are the same, the layout just handles the formatting.
@injectable()
export class ThermalLayoutTransformer extends DefaultLayoutTransformer {}

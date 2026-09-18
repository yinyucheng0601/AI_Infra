export type TensorMode = 'weight' | 'gradient' | 'activation';
export type DataScenario = 'propagation' | 'anomaly' | 'normal';
export type MissingReason = 'not-collected' | 'not-applicable' | 'unavailable';

export interface QueryContext {
  runId: string;
  step: number;
  microbatch?: number;
  layerCount: number;
  scenario: DataScenario;
  mode: TensorMode;
}

export interface SamplingSpec {
  rows: number;
  columns: number;
  logicalShape: readonly [number, number];
  strategy: 'uniform-grid';
  scope: 'sample-only';
}

export interface StatisticsSpec {
  rms: 'sqrt(mean(x^2))';
  anomaly: 'non-finite-or-abs-over-reference-max';
  thresholdMultiplier: number;
  referenceStep: number;
}

export interface BlockStatistics {
  values: number[];
  rms: number;
  mean: number;
  min: number;
  max: number;
  negative: number;
}

export interface LayerSample {
  stats: BlockStatistics[];
  blocks: number[];
  rms: number;
}

export interface PropagationMetadata {
  gain: number;
  deltaRms: number;
  affected: number;
}

export interface TensorQueryResult {
  status: 'ready';
  context: QueryContext;
  sampling: SamplingSpec;
  statistics: StatisticsSpec;
  layers: LayerSample[];
  references: LayerSample[];
  limits: number[];
  propagation: PropagationMetadata[] | null;
}

export interface MissingResult {
  status: 'missing';
  reason: MissingReason;
  message: string;
  context: QueryContext;
}

export interface HiddenSample {
  values: number[];
  references: number[];
  rms: number;
  referenceRms: number;
  mean: number;
  peak: number;
  alerts: number;
}

export interface LayerDataSource {
  queryTensor(context: QueryContext): Promise<TensorQueryResult | MissingResult>;
  queryHidden(context: QueryContext, boundary: number): Promise<HiddenSample | MissingResult>;
}

/** Mock implementation used by the current standalone demo. Replace this
 * object with an API-backed LayerDataSource without changing view code. */
export declare const layerDataSource: LayerDataSource;


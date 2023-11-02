/*
 * Copyright 2023 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ObjectTypesFrom, OntologyDefinition } from "@osdk/api";
import {
  assertBucketingInternal,
  ComputeStep,
  isCountOperation,
  isMultipleAggregationOperation,
  MetricValueType,
} from "../../ontology-runtime";
import type {
  AggregatableObjectSetStep,
  BucketValue,
  InternalBucketing,
  ObjectSetDefinition,
} from "../../ontology-runtime";
import type { ClientContext } from "../../ontology-runtime/ontologyProvider/calls/ClientContext";
import type {
  AggregateSelection,
  GroupBySelections,
  MultipleAggregateSelection,
} from "../interfaces/aggregations";
import type { OsdkLegacyObjectFrom } from "../OsdkObject";
import { mapPropertiesToAggregatableProperties } from "./mapPropertiesToAggregatableProperties";
import { mapPropertiesToGroupByProperties } from "./mapPropertiesToGroupByProperties";
import { mapPropertiesToMultipleAggregationProperties } from "./mapPropertiesToMultipleAggregationProperties";

export function createObjectSetAggregationStep<
  O extends OntologyDefinition<any>,
  K extends ObjectTypesFrom<O>,
>(
  clientContext: ClientContext,
  type: K,
  definition: ObjectSetDefinition,
  groupByClauses: Array<InternalBucketing<string, BucketValue>>,
): AggregatableObjectSetStep<
  AggregateSelection<OsdkLegacyObjectFrom<O, K>>,
  MultipleAggregateSelection<OsdkLegacyObjectFrom<O, K>>,
  GroupBySelections<OsdkLegacyObjectFrom<O, K>>
> {
  // TODO defer these until they are needed and cache them by ontologyRid/objectType
  const aggregatableProperties = mapPropertiesToAggregatableProperties(
    clientContext.ontology as O,
    type,
  );
  const groupableProperties = mapPropertiesToGroupByProperties(
    clientContext.ontology as O,
    type,
  );
  const multipleAggregationProperties =
    mapPropertiesToMultipleAggregationProperties(
      clientContext.ontology as O,
      type,
    );

  return {
    aggregate(aggregateBuilder) {
      const aggregate = aggregateBuilder(multipleAggregationProperties);
      return new ComputeStep(
        clientContext,
        definition,
        groupByClauses,
        Object.keys(aggregate).map(key => {
          const aggregation = aggregate[key];
          if (isCountOperation(aggregation)) {
            return {
              type: aggregation.operation,
              name: key,
              metricValueType: MetricValueType.NUMERIC,
              namedAggregation: false,
            };
          }
          if (isMultipleAggregationOperation(aggregation)) {
            return {
              type: aggregation.operation,
              name: key,
              field: aggregation.propertyApiName,
              metricValueType: aggregation.metricValueType,
              namedAggregation: false,
            };
          }
          const _: never = aggregation;
          throw new Error(
            `Unknown aggregation type: ${(aggregation as any).type}`,
          );
        }),
      );
    },

    approximateDistinct(propertySelector) {
      const selectedProperty = propertySelector(aggregatableProperties);
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "approximateDistinct",
        name: "distinctCount",
        field: selectedProperty.propertyApiName,
        metricValueType: selectedProperty.metricValueType,
        namedAggregation: true,
      }]);
    },

    groupBy(propertySelector) {
      const groupByClause = propertySelector(groupableProperties);
      assertBucketingInternal(groupByClause);
      return createObjectSetAggregationStep<O, K>(
        clientContext,
        type,
        definition,
        [
          ...groupByClauses,
          groupByClause,
        ],
      ) as AggregatableObjectSetStep<
        AggregateSelection<OsdkLegacyObjectFrom<O, K>>,
        MultipleAggregateSelection<OsdkLegacyObjectFrom<O, K>>,
        GroupBySelections<OsdkLegacyObjectFrom<O, K>>,
        any // TODO infer the TBucketGroup shape from groupByClause to be more strict here
      >;
    },

    count() {
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "count",
        name: "count",
        metricValueType: MetricValueType.NUMERIC,
        namedAggregation: true,
      }]);
    },

    min(propertySelector) {
      const selectedProperty = propertySelector(aggregatableProperties);
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "min",
        name: "min",
        field: selectedProperty.propertyApiName,
        metricValueType: selectedProperty.metricValueType,
        namedAggregation: true,
      }]);
    },

    max(propertySelector) {
      const selectedProperty = propertySelector(aggregatableProperties);
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "max",
        name: "max",
        field: selectedProperty.propertyApiName,
        metricValueType: selectedProperty.metricValueType,
        namedAggregation: true,
      }]);
    },

    avg(propertySelector) {
      const selectedProperty = propertySelector(aggregatableProperties);
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "avg",
        name: "avg",
        field: selectedProperty.propertyApiName,
        metricValueType: selectedProperty.metricValueType,
        namedAggregation: true,
      }]);
    },

    sum(propertySelector) {
      const selectedProperty = propertySelector(aggregatableProperties);
      return new ComputeStep(clientContext, definition, groupByClauses, [{
        type: "sum",
        name: "sum",
        field: selectedProperty.propertyApiName,
        metricValueType: selectedProperty.metricValueType,
        namedAggregation: true,
      }]);
    },
  };
}

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

import type { StreamTimeSeriesPointsRequest as StreamPointsBody } from "@osdk/gateway/types";
import type { Auth } from "../../../oauth-client";
import {
  OntologyProvider,
  type Result,
  type TimeSeriesError,
} from "../../ontologyProvider";
import type { OntologyMetadata } from "../../ontologyProvider/OntologyMetadata";
import type { TimeSeriesPoint } from "./TimeSeriesPoint";

export class TimeSeriesTerminalOperations<T extends number | string> {
  #provider: OntologyProvider;
  #ontologyMetadata: OntologyMetadata;
  #auth: Auth;
  protected stack: string;
  protected propertyName: string;
  protected apiName: string;
  protected primaryKey: string;
  protected body: StreamPointsBody;

  constructor(
    auth: Auth,
    stack: string,
    propertyName: string,
    apiName: string,
    primaryKey: string,
    ontologyMetadata: OntologyMetadata,
    body: StreamPointsBody = {},
  ) {
    this.#provider = new OntologyProvider(auth, stack, ontologyMetadata);
    this.#ontologyMetadata = ontologyMetadata;
    this.#auth = auth;

    this.stack = stack;
    this.propertyName = propertyName;
    this.apiName = apiName;
    this.primaryKey = primaryKey;
    this.body = body;
  }

  protected getAuth(): Auth {
    return this.#auth;
  }

  protected getOntologyMetadata(): OntologyMetadata {
    return this.#ontologyMetadata;
  }
  /**
   * Get all the Time Series points.
   *
   * @example
   * const allPoints = object.property.points.all()
   */
  all(): Promise<Result<Array<TimeSeriesPoint<T>>>> {
    return this.#provider.getAllTimeSeriesPoints(
      this.apiName,
      this.primaryKey,
      this.propertyName,
      this.body,
    );
  }

  /**
   * Create an iterator to asynchronously iterate through Time Series points.
   *
   * @example
   * // Create iterator
   * const timeSeriesIterator = object.property.points.iterate();
   *
   * // Iterate through Time Series
   * for await (const point of timeSeriesIterator) {
   *         // Handle Time Series Point
   * }
   */
  iterate(): TimeSeriesIterator<T> {
    return this.#provider.iterateTimeSeriesPoints(
      this.apiName,
      this.primaryKey,
      this.propertyName,
      this.body,
    );
  }
}
export type TimeSeriesIterator<T extends string | number> = AsyncGenerator<
  Result<TimeSeriesPoint<T>, TimeSeriesError>,
  any,
  unknown
>;

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

import type { ThinClient } from "@osdk/api";
import { createThinClient } from "@osdk/api";
import type { TimeSeriesPoint } from "@osdk/gateway/types";
import type { MockedFunction } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockOntology } from "../../../util/test";
import {
  expectFetchToBeCalledWithGet,
  mockFetchResponse,
} from "../../../util/test/fetchUtils";
import { MOCK_ORIGIN } from "../../../util/test/mocks/mockMetadata";
import { unwrapResultOrThrow } from "../../../util/test/resultUtils";
import { Timestamp } from "../..";
import { getLastPoint } from "./getLastPoint";

describe(getLastPoint, () => {
  const fetch: MockedFunction<typeof globalThis.fetch> = vi.fn();
  const client: ThinClient<typeof MockOntology> = createThinClient(
    MockOntology,
    MOCK_ORIGIN,
    () => "Token",
    fetch,
  );
  beforeEach(() => {
    fetch.mockClear();
  });

  it("getsLastPoint", async () => {
    const point: TimeSeriesPoint = {
      value: 1,
      time: "2019-01-01T01:01:01.000Z",
    };

    mockFetchResponse(fetch, point);
    const lastPointResult = await getLastPoint(
      client,
      "objectApiName",
      1,
      "property",
    );

    const lastPoint = unwrapResultOrThrow(lastPointResult);
    expect(lastPoint.time).toEqual(Timestamp.fromISOString(point.time));
    expect(lastPoint.value).toEqual(1);
    expectFetchToBeCalledWithGet(
      fetch,
      `Ontology/objects/objectApiName/1/timeseries/property/lastPoint`,
    );
  });
});

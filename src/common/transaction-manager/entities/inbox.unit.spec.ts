import { describe, expect, it, jest } from "@jest/globals";

import { Inbox } from "./inbox.entity";

describe("Inbox", () => {
    describe("constructor", () => {
        it("maps the incoming event and source metadata", () => {
            jest.useFakeTimers().setSystemTime(new Date("2026-09-14T00:00:00.000Z"));

            const entity = new Inbox({
                consumerKey: "template.placeholder.v1",
                event: "event-1",
                source: { topic: "source-topic", partition: 2, offset: "42" },
            });

            expect(entity).toEqual({
                consumerKey: "template.placeholder.v1",
                event: "event-1",
                topic: "source-topic",
                partition: 2,
                offset: "42",
                processedAt: new Date("2026-09-14T00:00:00.000Z"),
            });

            jest.useRealTimers();
        });

        it("keeps source metadata optional", () => {
            const entity = new Inbox({ consumerKey: "template.placeholder.v1", event: "event-1" });

            expect(entity.topic).toBeUndefined();
            expect(entity.partition).toBeUndefined();
            expect(entity.offset).toBeUndefined();
        });
    });
});

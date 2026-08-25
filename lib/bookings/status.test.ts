import { describe, expect, it } from "vitest";
import { bucketForBooking, isBookingModifiable } from "./status";

const PAST_DATE = "2000-01-01";
const PAST_END_TIME = "11:00";
const FUTURE_DATE = "2999-01-01";
const FUTURE_END_TIME = "11:00";

describe("isBookingModifiable", () => {
  it("is modifiable when pending and not yet past", () => {
    expect(isBookingModifiable("pending", FUTURE_DATE, FUTURE_END_TIME)).toBe(true);
  });

  it("is modifiable when approved and not yet past", () => {
    expect(isBookingModifiable("approved", FUTURE_DATE, FUTURE_END_TIME)).toBe(true);
  });

  it("is not modifiable once its end time has passed", () => {
    expect(isBookingModifiable("approved", PAST_DATE, PAST_END_TIME)).toBe(false);
  });

  it("is not modifiable when rejected, regardless of date", () => {
    expect(isBookingModifiable("rejected", FUTURE_DATE, FUTURE_END_TIME)).toBe(false);
  });

  it("is not modifiable when cancelled, regardless of date", () => {
    expect(isBookingModifiable("cancelled", FUTURE_DATE, FUTURE_END_TIME)).toBe(false);
  });
});

describe("bucketForBooking", () => {
  it("buckets a cancelled booking as cancelled even if it's still upcoming", () => {
    expect(bucketForBooking("cancelled", FUTURE_DATE, FUTURE_END_TIME)).toBe("cancelled");
  });

  it("buckets a cancelled booking as cancelled even if it's already past", () => {
    expect(bucketForBooking("cancelled", PAST_DATE, PAST_END_TIME)).toBe("cancelled");
  });

  it("buckets a rejected booking as rejected even if it's still upcoming", () => {
    expect(bucketForBooking("rejected", FUTURE_DATE, FUTURE_END_TIME)).toBe("rejected");
  });

  it("buckets a rejected booking as rejected even if it's already past", () => {
    expect(bucketForBooking("rejected", PAST_DATE, PAST_END_TIME)).toBe("rejected");
  });

  it("buckets a past approved booking as past", () => {
    expect(bucketForBooking("approved", PAST_DATE, PAST_END_TIME)).toBe("past");
  });

  it("buckets a past pending booking as past", () => {
    expect(bucketForBooking("pending", PAST_DATE, PAST_END_TIME)).toBe("past");
  });

  it("buckets a future pending booking as pending", () => {
    expect(bucketForBooking("pending", FUTURE_DATE, FUTURE_END_TIME)).toBe("pending");
  });

  it("buckets a future approved booking as upcoming", () => {
    expect(bucketForBooking("approved", FUTURE_DATE, FUTURE_END_TIME)).toBe("upcoming");
  });
});
